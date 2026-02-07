import { useState, useEffect } from 'react';
import { FaDollarSign, FaSpinner, FaEdit, FaPrint, FaEye, FaPlus } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';

const BranchGenerateSalary = () => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

    const [instructors, setInstructors] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedInstructor, setSelectedInstructor] = useState(null);
    const [showSalaryModal, setShowSalaryModal] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);

    const [filters, setFilters] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        department: '',
        instructor: ''
    });

    const [salaryData, setSalaryData] = useState({
        employeeId: '',
        employeeName: '',
        department: '',
        basicSalary: 0,
        workingDays: 0,
        presentDays: 0,
        absentDays: 0,
        leaveDays: 0,
        overtimeHours: 0,
        overtimeRate: 0,
        allowances: [
            { name: 'House Rent Allowance (HRA)', amount: 0 },
            { name: 'Transport Allowance', amount: 0 },
            { name: 'Medical Allowance', amount: 0 },
            { name: 'Special Allowance', amount: 0 }
        ],
        deductions: [
            { name: 'Provident Fund (PF)', amount: 0 },
            { name: 'Professional Tax', amount: 0 },
            { name: 'Income Tax (TDS)', amount: 0 },
            { name: 'Late Coming Fine', amount: 0 },
            { name: 'Other Deductions', amount: 0 }
        ],
        advance: 0,
        bonus: 0
    });

    const [generatedSalaries, setGeneratedSalaries] = useState([]);
    const [advances, setAdvances] = useState([]);

    // Get auth token (branch-specific)
    const getAuthToken = () => {
        // For branch components, prioritize branch-specific tokens only
        return localStorage.getItem('branchToken') || localStorage.getItem('token');
    };

    // Get branch context for validation
    const getBranchContext = () => {
        try {
            // Try multiple possible keys for user data
            const possibleKeys = ['userData', 'user', 'currentUser', 'authUser', 'branchUser'];
            let userData = null;
            let usedKey = null;

            for (const key of possibleKeys) {
                const userDataStr = localStorage.getItem(key);
                if (userDataStr && userDataStr !== 'null' && userDataStr !== 'undefined') {
                    try {
                        userData = JSON.parse(userDataStr);
                        usedKey = key;
                        break;
                    } catch (e) {
                        console.warn(`Failed to parse ${key} from localStorage:`, e);
                    }
                }
            }

            // Debug localStorage contents
            console.log('🔍 Debugging localStorage contents:');
            for (const key of possibleKeys) {
                const value = localStorage.getItem(key);
                console.log(`  ${key}:`, value?.substring(0, 100) + (value?.length > 100 ? '...' : ''));
            }

            // Also check for direct branch/franchise codes in localStorage
            const directBranchCode = localStorage.getItem('branchCode') || localStorage.getItem('branch_code');
            const directFranchiseCode = localStorage.getItem('franchiseCode') || localStorage.getItem('franchise_code');

            console.log('🔍 Direct codes in localStorage:');
            console.log('  branchCode:', directBranchCode);
            console.log('  franchiseCode:', directFranchiseCode);

            // Try to decode JWT token as fallback
            if (!userData) {
                console.log('🔑 Attempting to decode JWT token for user context');
                try {
                    const token = getAuthToken();
                    if (token) {
                        // Simple JWT decode (without verification, just for getting payload)
                        const tokenParts = token.split('.');
                        if (tokenParts.length === 3) {
                            const payload = JSON.parse(atob(tokenParts[1]));
                            console.log('🔓 Token payload:', payload);

                            userData = {
                                user_id: payload.user_id,
                                role: payload.role,
                                branch_code: payload.branch_code,
                                franchise_code: payload.franchise_code,
                                is_branch_admin: payload.is_branch_admin,
                                name: payload.name || payload.email
                            };
                            usedKey = 'JWT_TOKEN';
                        }
                    }
                } catch (tokenError) {
                    console.warn('Failed to decode JWT token:', tokenError);
                }
            }

            if (userData) {
                console.log('✅ User data found in:', usedKey);
                console.log('📊 User data object:', userData);

                return {
                    branchCode: userData.branch_code || userData.franchise_code || userData.branchCode || userData.franchiseCode || directBranchCode || directFranchiseCode,
                    role: userData.role || userData.userRole || 'user',
                    isAdmin: userData.role === 'admin' || userData.role === 'superAdmin' || userData.isAdmin,
                    isBranchAdmin: userData.is_branch_admin || userData.role === 'branchAdmin' || userData.isBranchAdmin,
                    userId: userData.user_id || userData.id || userData.userId,
                    name: userData.name || userData.userName || userData.full_name
                };
            } else if (directBranchCode || directFranchiseCode) {
                console.log('⚠️ No structured user data found, using direct codes');
                return {
                    branchCode: directBranchCode || directFranchiseCode,
                    role: 'user',
                    isAdmin: false,
                    isBranchAdmin: true,
                    userId: null,
                    name: 'Branch User'
                };
            } else {
                console.error('❌ No user data found in localStorage');
                return null;
            }
        } catch (error) {
            console.error('Error getting branch context:', error);
            return null;
        }
    };

    // Filter salaries to ensure only branch-specific data is shown
    // This filters out admin role salaries and shows only branch_admin salaries
    const filterBranchSalaries = (salaries, branchContext) => {
        // If no salaries, return empty array
        if (!salaries || salaries.length === 0) {
            console.log('📊 No salaries received from backend');
            return [];
        }

        console.log('📊 Total salaries received from backend:', salaries.length);
        console.log('🏢 Current branch context:', branchContext);

        // Log first salary to see its structure
        if (salaries.length > 0) {
            console.log('📋 Sample salary object keys:', Object.keys(salaries[0]));
            console.log('📋 Sample salary:', salaries[0]);
        }

        // Filter salaries by employee ID format (BR-XXXXXX-INS-XXXX pattern indicates branch_admin)
        // Employee IDs starting with "BR-" are from branch_admin
        const filteredSalaries = salaries.filter(salary => {
            const employeeId = salary.employeeId || '';

            // Check if employee ID matches branch_admin pattern: BR-XXXXXX-INS-XXXX
            const isBranchEmployee = employeeId.startsWith('BR-');

            console.log(`📋 Salary for ${salary.employeeName}: employeeId=${employeeId}, isBranchEmployee=${isBranchEmployee}`);

            return isBranchEmployee;
        });

        console.log('✅ Filtered salaries (branch employees only):', filteredSalaries.length);
        return filteredSalaries;
    };

    // Fetch instructors from API
    const fetchInstructors = async () => {
        try {
            setLoading(true);
            const token = getAuthToken();
            const branchContext = getBranchContext();

            if (!token) {
                setError('Authentication token not found. Please login again.');
                return;
            }

            console.log('🔍 Fetching instructors for branch context:', branchContext);

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
                console.log('📊 Branch context:', branchContext);
                setInstructors(data);
            } else {
                const errorText = await response.text();
                console.error('Failed to fetch instructors:', response.status, errorText);
                setError('Failed to fetch instructors');
            }
        } catch (error) {
            console.error('Error fetching instructors:', error);
            setError('Error loading instructors: ' + error.message);
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
                const deptList = data.departments || data || [];
                setDepartments(Array.isArray(deptList) ? deptList : []);
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    // Fetch generated salaries from API
    const fetchGeneratedSalaries = async () => {
        try {
            const token = getAuthToken();
            const branchContext = getBranchContext();

            if (!token) {
                setError('Authentication token not found. Please login again.');
                return;
            }

            if (!branchContext || !branchContext.branchCode) {
                console.warn('⚠️ No branch context found - user might be admin');
            }

            console.log('🔍 Fetching salaries for branch context:', branchContext);

            const response = await fetch(`${API_BASE_URL}/api/branch/salaries`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Raw salaries response:', data);
                console.log('📊 Branch context:', branchContext);
                console.log('📊 Total salaries received:', data.salaries?.length || 0);

                // Apply branch-specific filtering
                const allSalaries = data.salaries || [];
                const filteredSalaries = filterBranchSalaries(allSalaries, branchContext);

                console.log('📊 Salaries after filtering:', filteredSalaries.length);
                console.log('📋 Filtered salaries:', filteredSalaries);

                setGeneratedSalaries(filteredSalaries);
            } else {
                const errorText = await response.text();
                console.error('Failed to fetch salaries:', response.status, errorText);
                setError('Failed to fetch salary records');
            }
        } catch (error) {
            console.error('Error fetching salaries:', error);
            setError('Error loading salary data: ' + error.message);
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
        // Debug branch context immediately
        console.log('🚀 Component mounted, checking branch context...');
        const branchContext = getBranchContext();
        console.log('🏢 Initial branch context:', branchContext);

        fetchInstructors();
        fetchDepartments();
        fetchGeneratedSalaries();
        fetchAdvances();
    }, []);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleGenerateSalary = (instructor) => {
        setSelectedInstructor(instructor);

        // Calculate instructor's advance due
        const instructorAdvances = advances.filter(adv => adv.employeeId === instructor.employee_code || adv.employeeId === instructor.id);
        const totalPaid = instructorAdvances
            .filter(adv => adv.advanceType === 'paid')
            .reduce((sum, adv) => sum + (adv.amount || 0), 0);
        const totalDeducted = instructorAdvances
            .filter(adv => adv.advanceType === 'deducted')
            .reduce((sum, adv) => sum + (adv.amount || 0), 0);
        const advanceDue = totalPaid - totalDeducted;

        const basicSalary = instructor.basicSalary || 0;

        setSalaryData({
            employeeId: instructor.employee_code || instructor.id,
            employeeName: instructor.name,
            department: instructor.department || '',
            basicSalary: basicSalary,
            workingDays: 26,
            presentDays: 24,
            absentDays: 2,
            leaveDays: 0,
            overtimeHours: 0,
            overtimeRate: 150,
            allowances: [
                { name: 'House Rent Allowance (HRA)', amount: basicSalary * 0.4 },
                { name: 'Transport Allowance', amount: 2000 },
                { name: 'Medical Allowance', amount: 1500 },
                { name: 'Special Allowance', amount: 1000 }
            ],
            deductions: [
                { name: 'Provident Fund (PF)', amount: basicSalary * 0.12 },
                { name: 'Professional Tax', amount: 200 },
                { name: 'Income Tax (TDS)', amount: 0 },
                { name: 'Late Coming Fine', amount: 0 },
                { name: 'Other Deductions', amount: 0 }
            ],
            advance: advanceDue > 0 ? advanceDue : 0,
            bonus: 0
        });
        setShowGenerateModal(true);
    };

    const handleAllowanceChange = (index, value) => {
        const newAllowances = [...salaryData.allowances];
        newAllowances[index].amount = parseFloat(value) || 0;
        setSalaryData({ ...salaryData, allowances: newAllowances });
    };

    const handleDeductionChange = (index, value) => {
        const newDeductions = [...salaryData.deductions];
        newDeductions[index].amount = parseFloat(value) || 0;
        setSalaryData({ ...salaryData, deductions: newDeductions });
    };

    const calculateSalary = () => {
        const perDaySalary = salaryData.basicSalary / salaryData.workingDays;
        const earnedBasicSalary = perDaySalary * salaryData.presentDays;

        const totalAllowances = salaryData.allowances.reduce((sum, item) => sum + item.amount, 0);
        const overtimePay = salaryData.overtimeHours * salaryData.overtimeRate;

        const grossSalary = earnedBasicSalary + totalAllowances + overtimePay + salaryData.bonus;

        const totalDeductions = salaryData.deductions.reduce((sum, item) => sum + item.amount, 0);
        const netSalary = grossSalary - totalDeductions - salaryData.advance;

        return {
            earnedBasicSalary: earnedBasicSalary.toFixed(2),
            totalAllowances: totalAllowances.toFixed(2),
            overtimePay: overtimePay.toFixed(2),
            grossSalary: grossSalary.toFixed(2),
            totalDeductions: totalDeductions.toFixed(2),
            netSalary: netSalary.toFixed(2)
        };
    };

    const handleSubmitSalary = async () => {
        const calculations = calculateSalary();
        const branchContext = getBranchContext();

        // Validate required fields before sending
        const requiredFields = ['employeeId', 'employeeName', 'basicSalary'];
        const missingFields = requiredFields.filter(field => !salaryData[field]);

        if (missingFields.length > 0) {
            alert(`Missing required fields: ${missingFields.join(', ')}`);
            return;
        }

        const salaryRecord = {
            ...salaryData,
            ...calculations,
            month: parseInt(filters.month),
            year: parseInt(filters.year),
            generatedDate: new Date().toISOString(),
            // Ensure numeric fields are properly formatted
            basicSalary: parseFloat(salaryData.basicSalary) || 0,
            workingDays: parseInt(salaryData.workingDays) || 26,
            presentDays: parseInt(salaryData.presentDays) || 24,
            absentDays: parseInt(salaryData.absentDays) || 0,
            leaveDays: parseInt(salaryData.leaveDays) || 0,
            overtimeHours: parseInt(salaryData.overtimeHours) || 0,
            overtimeRate: parseFloat(salaryData.overtimeRate) || 0,
            advance: parseFloat(salaryData.advance) || 0,
            bonus: parseFloat(salaryData.bonus) || 0
        };

        console.log('📝 Submitting salary with branch context:', branchContext);
        console.log('📝 Complete salary record:', JSON.stringify(salaryRecord, null, 2));
        console.log('📝 Data types check:', {
            month: typeof salaryRecord.month,
            year: typeof salaryRecord.year,
            basicSalary: typeof salaryRecord.basicSalary,
            grossSalary: typeof salaryRecord.grossSalary,
            netSalary: typeof salaryRecord.netSalary
        });

        try {
            const token = getAuthToken();

            if (!token) {
                alert('Authentication token not found. Please login again.');
                return;
            }

            console.log('🔄 Sending POST request to:', `${API_BASE_URL}/api/branch/salaries`);

            const response = await fetch(`${API_BASE_URL}/api/branch/salaries`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(salaryRecord)
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Salary generated successfully:', result);

                // Refresh salaries list immediately
                console.log('🔄 Refreshing salaries list...');
                await fetchGeneratedSalaries();
                console.log('✅ Salaries list refreshed');

                setShowGenerateModal(false);
                alert('Salary generated and saved successfully!');
            } else {
                const responseText = await response.text();
                console.error('❌ Server error response:', responseText);

                try {
                    const errorData = JSON.parse(responseText);
                    alert(`Failed to generate salary: ${errorData.detail || errorData.message || 'Unknown error'}`);
                } catch (parseError) {
                    alert(`Failed to generate salary. Server returned: ${response.status} - ${responseText}`);
                }
            }
        } catch (error) {
            console.error('❌ Network/request error:', error);
            alert('Error generating salary: ' + error.message);
        }
    };

    const handleViewSalarySlip = (salary) => {
        setSelectedInstructor(salary);
        setSalaryData(salary);
        setShowSalaryModal(true);
    };

    const handlePrintSalarySlip = () => {
        window.print();
    };

    const filteredInstructors = instructors.filter(inst => {
        if (filters.department && inst.department !== filters.department) return false;
        if (filters.instructor && inst.id !== filters.instructor) return false;
        return true;
    });

    const calculations = showGenerateModal ? calculateSalary() : null;

    return (
        <BranchLayout>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="bg-gradient-to-r from-orange-600 to-teal-600 text-white p-2 rounded-lg">
                                    <FaDollarSign className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">Generate Instructor Salary</h1>
                                    <p className="text-gray-600">Manage instructor salary generation and payroll</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow-md mb-6 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                                <select
                                    value={filters.month}
                                    onChange={(e) => handleFilterChange('month', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="1">January</option>
                                    <option value="2">February</option>
                                    <option value="3">March</option>
                                    <option value="4">April</option>
                                    <option value="5">May</option>
                                    <option value="6">June</option>
                                    <option value="7">July</option>
                                    <option value="8">August</option>
                                    <option value="9">September</option>
                                    <option value="10">October</option>
                                    <option value="11">November</option>
                                    <option value="12">December</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                                <select
                                    value={filters.year}
                                    onChange={(e) => handleFilterChange('year', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="2023">2023</option>
                                    <option value="2024">2024</option>
                                    <option value="2025">2025</option>
                                    <option value="2026">2026</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                                <select
                                    value={filters.department}
                                    onChange={(e) => handleFilterChange('department', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Departments</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Instructor</label>
                                <select
                                    value={filters.instructor}
                                    onChange={(e) => handleFilterChange('instructor', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Instructors</option>
                                    {instructors.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.id} - {inst.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {/* Instructor List */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
                        <div className="p-4 bg-gray-50 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-800">Instructor List</h2>
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full table-auto">
                                <thead className="bg-orange-700 text-white">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">S.No.</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Emp ID</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Department</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Designation</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Basic Salary</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                                <FaSpinner className="animate-spin inline-block mr-2" />
                                                Loading instructors...
                                            </td>
                                        </tr>
                                    ) : filteredInstructors.length > 0 ? (
                                        filteredInstructors.map((instructor, index) => (
                                            <tr key={instructor.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-sm text-gray-700">{index + 1}.</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{instructor.employee_code || instructor.id}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{instructor.name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{instructor.department || 'N/A'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{instructor.specialization || 'Instructor'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">₹{instructor.basicSalary || 0}</td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => handleGenerateSalary(instructor)}
                                                        className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                                                    >
                                                        Generate Salary
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                                No instructors found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden">
                            {loading ? (
                                <div className="p-8 text-center text-gray-500">
                                    <FaSpinner className="animate-spin inline-block mr-2" />
                                    Loading instructors...
                                </div>
                            ) : filteredInstructors.length > 0 ? (
                                <div className="p-4 space-y-4">
                                    {filteredInstructors.map((instructor) => (
                                        <div key={instructor.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{instructor.name}</h3>
                                                    <p className="text-xs text-gray-500">{instructor.employee_code || instructor.id}</p>
                                                </div>
                                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                    {instructor.department || 'N/A'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
                                                <div>
                                                    <span className="block text-xs text-gray-400">Designation</span>
                                                    {instructor.specialization || 'Instructor'}
                                                </div>
                                                <div>
                                                    <span className="block text-xs text-gray-400">Basic Salary</span>
                                                    <span className="font-medium text-green-600">₹{instructor.basicSalary || 0}</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleGenerateSalary(instructor)}
                                                className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Generate Salary
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    No instructors found
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Generated Salaries */}
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-800">
                                Generated Salaries ({generatedSalaries.length})
                            </h2>
                        </div>
                        {generatedSalaries.length > 0 ? (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full table-auto">
                                        <thead className="bg-blue-600 text-white">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-semibold">S.No.</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold">Emp ID</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold">Month/Year</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold">Gross Salary</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold">Deductions</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold">Net Salary</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {generatedSalaries.map((salary, index) => (
                                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-sm text-gray-700">{index + 1}.</td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">{salary.employeeId}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">{salary.employeeName}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">{salary.month + '/' + salary.year}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">₹{salary.grossSalary}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">₹{salary.totalDeductions}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-orange-600">₹{salary.netSalary}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleViewSalarySlip(salary)}
                                                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                                                title="View Salary Slip"
                                                            >
                                                                <FaEye className="text-lg" />
                                                            </button>
                                                            <button
                                                                onClick={handlePrintSalarySlip}
                                                                className="text-orange-600 hover:text-orange-800 transition-colors"
                                                                title="Print Salary Slip"
                                                            >
                                                                <FaPrint className="text-lg" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Card View */}
                                <div className="md:hidden p-4 space-y-4">
                                    {generatedSalaries.map((salary, index) => (
                                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{salary.employeeName}</h3>
                                                    <p className="text-xs text-gray-500">{salary.employeeId}</p>
                                                </div>
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">
                                                    {salary.month + '/' + salary.year}
                                                </span>
                                            </div>

                                            <div className="bg-gray-50 rounded p-3 mb-3 grid grid-cols-2 gap-y-2 text-sm">
                                                <div>
                                                    <span className="text-xs text-gray-500 block">Gross Salary</span>
                                                    <span className="font-medium text-gray-900">₹{salary.grossSalary}</span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-gray-500 block">Net Salary</span>
                                                    <span className="font-bold text-orange-600">₹{salary.netSalary}</span>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-xs text-gray-500 block">Deductions</span>
                                                    <span className="font-medium text-red-600">₹{salary.totalDeductions}</span>
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                                                <button
                                                    onClick={() => handleViewSalarySlip(salary)}
                                                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                                                >
                                                    <FaEye /> View Slip
                                                </button>
                                                <button
                                                    onClick={handlePrintSalarySlip}
                                                    className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-800"
                                                >
                                                    <FaPrint /> Print
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="p-6 text-center text-gray-500">
                                <p>No salary records found for this month/year.</p>
                                <p className="text-sm text-gray-400">Generate salaries for instructors to see them here.</p>
                            </div>
                        )}
                    </div>

                    {/* Generate Salary Modal */}
                    {showGenerateModal && (
                        <div className="fixed inset-0 bg-white/20 backdrop-blur-md z-50 overflow-y-auto">
                            <div className="flex min-h-screen items-start justify-center p-4 py-8">
                                <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl w-full max-w-4xl my-4">
                                    <div className="p-6">
                                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Generate Salary - {salaryData.employeeName}</h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                            {/* Left Column */}
                                            <div className="space-y-4">
                                                <div className="bg-blue-50 p-4 rounded-lg">
                                                    <h3 className="font-semibold text-gray-800 mb-3">Instructor Details</h3>
                                                    <div className="space-y-2 text-sm">
                                                        <p><span className="font-medium">Employee ID:</span> {salaryData.employeeId}</p>
                                                        <p><span className="font-medium">Department:</span> {salaryData.department}</p>
                                                        <p><span className="font-medium">Basic Salary:</span> ₹{salaryData.basicSalary}</p>
                                                    </div>
                                                </div>

                                                <div className="bg-orange-50 p-4 rounded-lg">
                                                    <h3 className="font-semibold text-gray-800 mb-3">Attendance Details</h3>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Working Days</label>
                                                            <input
                                                                type="number"
                                                                value={salaryData.workingDays}
                                                                onChange={(e) => setSalaryData({ ...salaryData, workingDays: parseInt(e.target.value) || 0 })}
                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Present Days</label>
                                                            <input
                                                                type="number"
                                                                value={salaryData.presentDays}
                                                                onChange={(e) => setSalaryData({ ...salaryData, presentDays: parseInt(e.target.value) || 0 })}
                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Absent Days</label>
                                                            <input
                                                                type="number"
                                                                value={salaryData.absentDays}
                                                                onChange={(e) => setSalaryData({ ...salaryData, absentDays: parseInt(e.target.value) || 0 })}
                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Leave Days</label>
                                                            <input
                                                                type="number"
                                                                value={salaryData.leaveDays}
                                                                onChange={(e) => setSalaryData({ ...salaryData, leaveDays: parseInt(e.target.value) || 0 })}
                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-purple-50 p-4 rounded-lg">
                                                    <h3 className="font-semibold text-gray-800 mb-3">Overtime & Bonus</h3>
                                                    <div className="space-y-2">
                                                        <div className="flex gap-2">
                                                            <div className="flex-1">
                                                                <label className="block text-xs font-medium text-gray-700 mb-1">Overtime Hours</label>
                                                                <input
                                                                    type="number"
                                                                    value={salaryData.overtimeHours}
                                                                    onChange={(e) => setSalaryData({ ...salaryData, overtimeHours: parseInt(e.target.value) || 0 })}
                                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="block text-xs font-medium text-gray-700 mb-1">OT Rate (₹/hr)</label>
                                                                <input
                                                                    type="number"
                                                                    value={salaryData.overtimeRate}
                                                                    onChange={(e) => setSalaryData({ ...salaryData, overtimeRate: parseInt(e.target.value) || 0 })}
                                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Bonus Amount</label>
                                                            <input
                                                                type="number"
                                                                value={salaryData.bonus}
                                                                onChange={(e) => setSalaryData({ ...salaryData, bonus: parseFloat(e.target.value) || 0 })}
                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Advance Taken</label>
                                                            <input
                                                                type="number"
                                                                value={salaryData.advance}
                                                                onChange={(e) => setSalaryData({ ...salaryData, advance: parseFloat(e.target.value) || 0 })}
                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Column */}
                                            <div className="space-y-4">
                                                <div className="bg-orange-50 p-4 rounded-lg">
                                                    <h3 className="font-semibold text-gray-800 mb-3">Allowances</h3>
                                                    <div className="space-y-2">
                                                        {salaryData.allowances.map((allowance, index) => (
                                                            <div key={index}>
                                                                <label className="block text-xs font-medium text-gray-700 mb-1">{allowance.name}</label>
                                                                <input
                                                                    type="number"
                                                                    value={allowance.amount}
                                                                    onChange={(e) => handleAllowanceChange(index, e.target.value)}
                                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="bg-red-50 p-4 rounded-lg">
                                                    <h3 className="font-semibold text-gray-800 mb-3">Deductions</h3>
                                                    <div className="space-y-2">
                                                        {salaryData.deductions.map((deduction, index) => (
                                                            <div key={index}>
                                                                <label className="block text-xs font-medium text-gray-700 mb-1">{deduction.name}</label>
                                                                <input
                                                                    type="number"
                                                                    value={deduction.amount}
                                                                    onChange={(e) => handleDeductionChange(index, e.target.value)}
                                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Salary Summary */}
                                        {calculations && (
                                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg mb-6">
                                                <h3 className="font-bold text-lg text-gray-800 mb-4">Salary Summary</h3>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                    <div className="bg-white p-3 rounded shadow-sm">
                                                        <p className="text-xs text-gray-600">Earned Basic Salary</p>
                                                        <p className="text-lg font-bold text-gray-800">₹{calculations.earnedBasicSalary}</p>
                                                    </div>
                                                    <div className="bg-white p-3 rounded shadow-sm">
                                                        <p className="text-xs text-gray-600">Total Allowances</p>
                                                        <p className="text-lg font-bold text-orange-600">+₹{calculations.totalAllowances}</p>
                                                    </div>
                                                    <div className="bg-white p-3 rounded shadow-sm">
                                                        <p className="text-xs text-gray-600">Overtime Pay</p>
                                                        <p className="text-lg font-bold text-orange-600">+₹{calculations.overtimePay}</p>
                                                    </div>
                                                    <div className="bg-white p-3 rounded shadow-sm">
                                                        <p className="text-xs text-gray-600">Gross Salary</p>
                                                        <p className="text-lg font-bold text-blue-600">₹{calculations.grossSalary}</p>
                                                    </div>
                                                    <div className="bg-white p-3 rounded shadow-sm">
                                                        <p className="text-xs text-gray-600">Total Deductions</p>
                                                        <p className="text-lg font-bold text-red-600">-₹{calculations.totalDeductions}</p>
                                                    </div>
                                                    <div className="bg-white p-3 rounded shadow-sm border-2 border-orange-500">
                                                        <p className="text-xs text-gray-600 font-semibold">Net Salary</p>
                                                        <p className="text-xl font-bold text-orange-600">₹{calculations.netSalary}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-end space-x-3">
                                            <button
                                                onClick={() => setShowGenerateModal(false)}
                                                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSubmitSalary}
                                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                            >
                                                Generate & Save Salary
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* View Salary Slip Modal */}
                    {showSalaryModal && (
                        <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 overflow-y-auto">
                            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl w-full max-w-3xl mx-4 my-8">
                                <div className="p-8">
                                    <div className="text-center mb-6 border-b-2 border-gray-300 pb-4">
                                        <h2 className="text-3xl font-bold text-gray-800">SALARY SLIP</h2>
                                        <p className="text-gray-600 mt-2">Month: {salaryData.month + '/' + salaryData.year}</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm">
                                        <div>
                                            <p className="text-gray-600">Employee ID: <span className="font-semibold text-gray-800">{salaryData.employeeId}</span></p>
                                            <p className="text-gray-600">Name: <span className="font-semibold text-gray-800">{salaryData.employeeName}</span></p>
                                            <p className="text-gray-600">Department: <span className="font-semibold text-gray-800">{salaryData.department}</span></p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">Working Days: <span className="font-semibold text-gray-800">{salaryData.workingDays}</span></p>
                                            <p className="text-gray-600">Present Days: <span className="font-semibold text-gray-800">{salaryData.presentDays}</span></p>
                                            <p className="text-gray-600">Absent Days: <span className="font-semibold text-gray-800">{salaryData.absentDays}</span></p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <h4 className="font-bold text-gray-800 mb-3 bg-orange-100 p-2 rounded">Earnings</h4>
                                            <table className="w-full text-sm">
                                                <tbody>
                                                    <tr className="border-b">
                                                        <td className="py-2 text-gray-700">Basic Salary</td>
                                                        <td className="py-2 text-right font-semibold">₹{salaryData.earnedBasicSalary}</td>
                                                    </tr>
                                                    {salaryData.allowances && salaryData.allowances.map((allowance, index) => (
                                                        <tr key={index} className="border-b">
                                                            <td className="py-2 text-gray-700">{allowance.name}</td>
                                                            <td className="py-2 text-right font-semibold">₹{allowance.amount}</td>
                                                        </tr>
                                                    ))}
                                                    {salaryData.overtimePay > 0 && (
                                                        <tr className="border-b">
                                                            <td className="py-2 text-gray-700">Overtime Pay</td>
                                                            <td className="py-2 text-right font-semibold">₹{salaryData.overtimePay}</td>
                                                        </tr>
                                                    )}
                                                    {salaryData.bonus > 0 && (
                                                        <tr className="border-b">
                                                            <td className="py-2 text-gray-700">Bonus</td>
                                                            <td className="py-2 text-right font-semibold">₹{salaryData.bonus}</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-gray-800 mb-3 bg-red-100 p-2 rounded">Deductions</h4>
                                            <table className="w-full text-sm">
                                                <tbody>
                                                    {salaryData.deductions && salaryData.deductions.map((deduction, index) => (
                                                        <tr key={index} className="border-b">
                                                            <td className="py-2 text-gray-700">{deduction.name}</td>
                                                            <td className="py-2 text-right font-semibold">₹{deduction.amount}</td>
                                                        </tr>
                                                    ))}
                                                    {salaryData.advance > 0 && (
                                                        <tr className="border-b">
                                                            <td className="py-2 text-gray-700">Advance Taken</td>
                                                            <td className="py-2 text-right font-semibold">₹{salaryData.advance}</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="border-t-2 border-gray-300 pt-4 mb-6">
                                        <div className="grid grid-cols-2 gap-4 text-lg font-bold">
                                            <div className="bg-blue-100 p-3 rounded">
                                                <p className="text-gray-700">Gross Salary:</p>
                                                <p className="text-blue-700">₹{salaryData.grossSalary}</p>
                                            </div>
                                            <div className="bg-orange-100 p-3 rounded">
                                                <p className="text-gray-700">Net Salary:</p>
                                                <p className="text-orange-700">₹{salaryData.netSalary}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end space-x-3">
                                        <button
                                            onClick={() => setShowSalaryModal(false)}
                                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                        >
                                            Close
                                        </button>
                                        <button
                                            onClick={handlePrintSalarySlip}
                                            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                                        >
                                            <FaPrint /> Print Salary Slip
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </BranchLayout>
    );
};

export default BranchGenerateSalary;
