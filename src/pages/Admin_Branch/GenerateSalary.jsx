import React, { useState, useEffect } from 'react';
import BranchLayout from '../../components/Branch/BranchLayout';
import { FaSpinner, FaEdit, FaPrint, FaEye, FaPlus } from 'react-icons/fa';
import authService from '../../services/authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const GenerateSalary = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [advances, setAdvances] = useState([]); // Add advances state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // API helper function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const [filters, setFilters] = useState({
    department: '',
    search: ''
  });

  const [salaryData, setSalaryData] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    basicSalary: 0,
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

  useEffect(() => {
    // 1. Try to load from cache immediately (Stale-While-Revalidate)
    const CACHE_KEYS = {
      DEPARTMENTS: 'branch_salary_depts',
      EMPLOYEES: 'branch_salary_staff',
      SALARIES: 'branch_salary_generated',
      ADVANCES: 'branch_salary_advances'
    };

    const cachedDepts = localStorage.getItem(CACHE_KEYS.DEPARTMENTS);
    const cachedStaff = localStorage.getItem(CACHE_KEYS.EMPLOYEES);
    const cachedSalaries = localStorage.getItem(CACHE_KEYS.SALARIES);
    const cachedAdvances = localStorage.getItem(CACHE_KEYS.ADVANCES);

    if (cachedDepts && cachedStaff && cachedSalaries && cachedAdvances) {
      try {
        setDepartments(JSON.parse(cachedDepts));
        setEmployees(JSON.parse(cachedStaff));
        setGeneratedSalaries(JSON.parse(cachedSalaries));
        setAdvances(JSON.parse(cachedAdvances));
        setLoading(false); // Show cached data immediately
      } catch (e) { console.error('Error parsing cached data', e); }
    }

    // 2. Fetch fresh data
    const loadData = async () => {
      // Don't set loading true if we already showed cached data
      if (!cachedStaff) setLoading(true);
      await fetchData();
    };

    loadData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch departments
      try {
        console.log('Fetching departments from:', `${API_BASE_URL}/api/branch/departments`);
        const deptResponse = await fetch(`${API_BASE_URL}/api/branch/departments`, {
          headers: getAuthHeaders()
        });

        console.log('Departments response status:', deptResponse.status);

        if (deptResponse.ok) {
          const deptData = await deptResponse.json();
          console.log('Departments received:', deptData);
          const depts = deptData.departments || [];
          setDepartments(depts);
          updateCache('branch_salary_depts', depts);
        } else {
          const errorText = await deptResponse.text();
          console.error('Failed to fetch departments:', deptResponse.status, errorText);
          setError('Failed to fetch departments');
          setDepartments([]);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
        setError(`Network error fetching departments: ${error.message}`);
        setDepartments([]);
      }

      // Fetch employees/staff
      try {
        console.log('Fetching staff from:', `${API_BASE_URL}/api/branch/staff`);
        const empResponse = await fetch(`${API_BASE_URL}/api/branch/staff`, {
          headers: getAuthHeaders()
        });

        console.log('Staff response status:', empResponse.status);

        if (empResponse.ok) {
          const empData = await empResponse.json();
          console.log('Staff received:', empData);

          // Debug: Log first employee to see structure
          if (empData.staff && empData.staff.length > 0) {
            console.log('First employee structure:', empData.staff[0]);
            console.log('Available fields:', Object.keys(empData.staff[0]));

            // Check for common field variations
            const emp = empData.staff[0];
            console.log('Field variations check:');
            console.log('- empId:', emp.empId);
            console.log('- employeeId:', emp.employeeId);
            console.log('- name:', emp.name);
            console.log('- employeeName:', emp.employeeName);
            console.log('- fullName:', emp.fullName);
            console.log('- department:', emp.department);
            console.log('- dept:', emp.dept);
            console.log('- designation:', emp.designation);
            console.log('- post:', emp.post);
            console.log('- role:', emp.role);
            console.log('- position:', emp.position);
            console.log('- basicSalary:', emp.basicSalary);
            console.log('- salary:', emp.salary);
          }

          setEmployees(empData.staff || []);
          updateCache('branch_salary_staff', empData.staff || []);
        } else {
          const errorText = await empResponse.text();
          console.error('Failed to fetch staff:', empResponse.status, errorText);
          setEmployees([]);
        }
      } catch (error) {
        console.error('Error fetching staff:', error);
        setEmployees([]);
      }

      // Fetch generated salaries
      try {
        console.log('Fetching salaries from:', `${API_BASE_URL}/api/branch/salaries`);
        const salaryResponse = await fetch(`${API_BASE_URL}/api/branch/salaries`, {
          headers: getAuthHeaders()
        });

        console.log('Salaries response status:', salaryResponse.status);

        if (salaryResponse.ok) {
          const salaryData = await salaryResponse.json();
          console.log('Salaries received:', salaryData);
          setGeneratedSalaries(salaryData.salaries || []);
          updateCache('branch_salary_generated', salaryData.salaries || []);
        } else {
          const errorText = await salaryResponse.text();
          console.error('Failed to fetch salaries:', salaryResponse.status, errorText);
          setGeneratedSalaries([]);
        }
      } catch (error) {
        console.error('Error fetching salaries:', error);
        setGeneratedSalaries([]);
      }

      // Fetch advances data
      try {
        console.log('Fetching advances from:', `${API_BASE_URL}/api/branch/advances`);
        const advancesResponse = await fetch(`${API_BASE_URL}/api/branch/advances`, {
          headers: getAuthHeaders()
        });

        console.log('Advances response status:', advancesResponse.status);

        if (advancesResponse.ok) {
          const advancesData = await advancesResponse.json();
          console.log('Advances received:', advancesData);
          setAdvances(advancesData.advances || []);
          updateCache('branch_salary_advances', advancesData.advances || []);
        } else {
          const errorText = await advancesResponse.text();
          console.error('Failed to fetch advances:', advancesResponse.status, errorText);
          setAdvances([]);
        }
      } catch (error) {
        console.error('Error fetching advances:', error);
        setAdvances([]);
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Helper to update cache
  const updateCache = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error caching ${key}`, e);
    }
  };

  const calculateEmployeeAdvance = (employeeId, empId) => {
    // Calculate advance due from advances data with comprehensive matching
    const employeeAdvances = advances.filter(adv => {
      const matches = (
        adv.employee_id === employeeId ||
        adv.employeeId === employeeId ||
        adv.employee_id === empId ||
        adv.employeeId === empId ||
        adv.emp_id === empId ||
        String(adv.employee_id) === String(employeeId) ||
        String(adv.employee_id) === String(empId) ||
        String(adv.employeeId) === String(employeeId) ||
        String(adv.employeeId) === String(empId) ||
        parseInt(adv.employee_id) === parseInt(empId) ||
        parseInt(adv.employeeId) === parseInt(empId)
      );
      return matches;
    });

    const totalPaid = employeeAdvances
      .filter(adv => {
        const isPaid = (adv.advanceType === 'paid' || adv.advance_type === 'paid');
        const isActive = (adv.status === 'Active' || adv.status === 'active');
        return isPaid && isActive;
      })
      .reduce((sum, adv) => {
        const amount = parseFloat(adv.amount) || 0;
        return sum + amount;
      }, 0);

    const totalDeducted = employeeAdvances
      .filter(adv => {
        const isDeducted = (adv.advanceType === 'deducted' || adv.advance_type === 'deducted');
        const isActive = (adv.status === 'Active' || adv.status === 'active');
        return isDeducted && isActive;
      })
      .reduce((sum, adv) => {
        const amount = parseFloat(adv.amount) || 0;
        return sum + amount;
      }, 0);

    return totalPaid - totalDeducted;
  };

  // Check if salary already exists for employee in current month/year
  const isSalaryAlreadyGenerated = (employeeId) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    return generatedSalaries.some(salary =>
      (salary.employeeId === employeeId ||
        salary.employeeId === (employeeId?.toString())) &&
      salary.month === currentMonth &&
      salary.year === currentYear
    );
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateSalary = (employee) => {
    const employeeId = employee.empId || employee.employeeId;

    // Check if salary is already generated for current month
    if (isSalaryAlreadyGenerated(employeeId)) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      alert(`Salary for ${employee.employeeName || employee.name || employee.fullName} has already been generated for ${currentMonth}/${currentYear}. Cannot generate duplicate salary for the same month.`);
      return;
    }

    setSelectedEmployee(employee);

    // Calculate dynamic advance amount from API data
    const advanceAmount = calculateEmployeeAdvance(
      employee._id || employee.id,
      employee.empId || employee.employeeId
    );

    // Calculate dynamic allowances based on basic salary
    const basicSalary = parseFloat(employee.basicSalary || employee.salary) || 0;
    const hra = Math.round(basicSalary * 0.4); // 40% of basic salary
    const pf = Math.round(basicSalary * 0.12); // 12% of basic salary

    setSalaryData({
      employeeId: employee.empId || employee.employeeId || 'N/A',
      employeeName: employee.employeeName || employee.name || employee.fullName || 'Unknown',
      department: employee.department || employee.dept || 'N/A',
      basicSalary: basicSalary,
      overtimeHours: 0,
      overtimeRate: 150, // Default overtime rate, can be made configurable
      allowances: [
        { name: 'House Rent Allowance (HRA)', amount: hra },
        { name: 'Transport Allowance', amount: 2000 },
        { name: 'Medical Allowance', amount: 1500 },
        { name: 'Special Allowance', amount: 1000 }
      ],
      deductions: [
        { name: 'Provident Fund (PF)', amount: pf },
        { name: 'Professional Tax', amount: 200 },
        { name: 'Income Tax (TDS)', amount: 0 },
        { name: 'Late Coming Fine', amount: 0 },
        { name: 'Other Deductions', amount: 0 }
      ],
      advance: advanceAmount, // Use calculated advance amount
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
    // Use full basic salary instead of calculating per day attendance
    const earnedBasicSalary = salaryData.basicSalary;

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
    try {
      setError(null);
      const calculations = calculateSalary();
      const currentDate = new Date();
      const salaryRecord = {
        ...salaryData,
        ...calculations,
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
        generatedDate: currentDate.toISOString()
      };

      console.log('Saving salary record:', salaryRecord);

      const response = await fetch(`${API_BASE_URL}/api/branch/salaries`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(salaryRecord)
      });

      console.log('Save salary response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Save salary response:', result);
        fetchData(); // Refresh the list
        setShowGenerateModal(false);
        alert('Salary generated and saved successfully!');
      } else {
        const errorData = await response.text();
        setError(`Failed to save salary: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      console.error('Error saving salary:', error);
      setError(`Network error: ${error.message}`);
    }
  };

  const handleViewSalarySlip = (salary) => {
    setSelectedEmployee(salary);
    setSalaryData(salary);
    setShowSalaryModal(true);
  };

  const handlePrintSalarySlip = () => {
    window.print();
  };

  const filteredEmployees = employees.filter(emp => {
    // Get current user role
    const currentUser = authService.getCurrentUser();
    const userRole = currentUser?.role;

    // For admin users, exclude BR format employee IDs
    if (userRole === 'admin' || userRole === 'franchise_admin') {
      const empId = (emp.empId || emp.employeeId || '').toString().toUpperCase();
      // Skip employees with BR format IDs (like BR001, BR002, etc.)
      if (empId.startsWith('BR')) {
        return false;
      }
    }

    // Filter by department
    if (filters.department && emp.department !== filters.department) return false;

    // Filter by search query (employee ID, name, or designation)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const empId = (emp.empId || emp.employeeId || '').toString().toLowerCase();
      const empName = (emp.employeeName || emp.name || emp.fullName || '').toLowerCase();
      const designation = (emp.designation || emp.post || emp.role || emp.position || '').toLowerCase();

      const matchesSearch = empId.includes(searchTerm) ||
        empName.includes(searchTerm) ||
        designation.includes(searchTerm);

      if (!matchesSearch) return false;
    }

    return true;
  });

  if (loading && employees.length === 0) {
    return (
      <BranchLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FaSpinner className="text-4xl text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading salary data...</p>
          </div>
        </div>
      </BranchLayout>
    );
  }

  const calculations = showGenerateModal ? calculateSalary() : null;

  const filteredSalaries = generatedSalaries.filter(salary => {
    // Get current user role
    const currentUser = authService.getCurrentUser();
    const userRole = currentUser?.role;

    // For admin users, exclude BR format employee IDs
    if (userRole === 'admin' || userRole === 'franchise_admin') {
      const empId = (salary.employeeId || '').toString().toUpperCase();
      // Skip salaries with BR format IDs
      if (empId.startsWith('BR')) {
        return false;
      }
    }
    return true;
  });

  return (
    <BranchLayout>
      <div className="p-6 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-800">GENERATE SALARY</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Debug Info: Departments: {departments.length} | Staff: {employees.length} | Generated Salaries: {generatedSalaries.length} | Advances: {advances.length}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <select
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Employee</label>
                <input
                  type="text"
                  placeholder="Search by Employee ID, Name, or Designation..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Mobile Employee List (Cards) */}
        <div className="md:hidden space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 px-2">Employee List</h2>
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((employee, index) => (
              <div key={employee.id} className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{employee.employeeName || employee.name}</h3>
                    <p className="text-xs text-gray-500">ID: {employee.empId || employee.employeeId}</p>
                    <p className="text-xs text-gray-500">{employee.department}</p>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-gray-800">₹{employee.basicSalary || 0}</span>
                    <span className="text-xs text-gray-500">Basic</span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg mb-3">
                  <span className="text-xs text-gray-600 font-medium">Advance Due:</span>
                  <span className="text-red-600 font-bold">
                    ₹{calculateEmployeeAdvance(employee._id || employee.id, employee.empId || employee.employeeId).toLocaleString()}
                  </span>
                </div>

                {isSalaryAlreadyGenerated(employee.empId || employee.employeeId) ? (
                  <div className="w-full py-2 bg-green-100 text-green-800 rounded text-center text-sm font-medium">
                    ✓ Salary Generated
                  </div>
                ) : (
                  <button
                    onClick={() => handleGenerateSalary(employee)}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded text-center text-sm font-medium transition-colors"
                  >
                    Generate Salary
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg">No employees found</div>
          )}
        </div>

        {/* Desktop Employee List (Table) */}
        <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Employee List</h2>
              <div className="text-sm text-blue-600 font-medium">
                Current Month: {new Date().getMonth() + 1}/{new Date().getFullYear()}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-orange-700 text-white">
                  <th className="px-4 py-3 text-left text-sm font-semibold">S.No.</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Emp ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Department</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Designation</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Basic Salary</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Advance Due</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((employee, index) => (
                    <tr key={employee.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">{index + 1}.</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{employee.empId || employee.employeeId || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{employee.employeeName || employee.name || employee.fullName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{employee.department || employee.dept || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{employee.designation || employee.post || employee.role || employee.position || 'Not Assigned'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">₹{employee.basicSalary || employee.salary || 0}</td>
                      <td className="px-4 py-3 text-sm text-red-600 font-medium">
                        ₹{calculateEmployeeAdvance(employee._id || employee.id, employee.empId || employee.employeeId).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {isSalaryAlreadyGenerated(employee.empId || employee.employeeId) ? (
                          <span className="px-4 py-1.5 bg-green-100 text-green-800 rounded text-sm font-medium">
                            ✓ Generated
                          </span>
                        ) : (
                          <button
                            onClick={() => handleGenerateSalary(employee)}
                            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded text-sm transition-colors"
                          >
                            Generate Salary
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                      No employees found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Generated Salaries (Cards) */}
        {filteredSalaries.length > 0 && (
          <div className="md:hidden space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 px-2">Generated Salaries</h2>
            {filteredSalaries.map((salary) => (
              <div key={salary.id} className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{salary.employeeName}</h3>
                    <p className="text-xs text-gray-500">ID: {salary.employeeId}</p>
                    <p className="text-xs text-blue-600 font-medium">{salary.month}/{salary.year}</p>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-orange-600 text-lg">₹{salary.netSalary}</span>
                    <span className="text-xs text-gray-500">Net Salary</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2 rounded mb-3">
                  <div>
                    <span className="text-gray-500 block">Gross:</span>
                    <span className="font-medium">₹{salary.grossSalary}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Deductions:</span>
                    <span className="font-medium text-red-600">₹{salary.totalDeductions}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewSalarySlip(salary)}
                    className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg flex justify-center items-center hover:bg-blue-100"
                  >
                    <FaEye className="mr-2" /> View
                  </button>
                  <button
                    onClick={handlePrintSalarySlip}
                    className="flex-1 py-2 bg-orange-50 text-orange-600 rounded-lg flex justify-center items-center hover:bg-orange-100"
                  >
                    <FaPrint className="mr-2" /> Print
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Desktop Generated Salaries (Table) */}
        {filteredSalaries.length > 0 && (
          <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Generated Salaries</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-amber-500 text-white">
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
                <tbody>
                  {filteredSalaries.map((salary, index) => (
                    <tr key={salary.id} className="border-b border-gray-200 hover:bg-gray-50">
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
                            className="text-amber-600 hover:text-amber-800 transition-colors"
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
          </div>
        )}

        {/* Generate Salary Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 overflow-y-auto">
            <div className="flex min-h-screen items-start justify-center p-4 py-8">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl w-full max-w-4xl my-4 border border-white/20">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Generate Salary - {salaryData.employeeName}</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div className="bg-amber-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-gray-800 mb-3">Employee Details</h3>
                        <div className="space-y-2 text-sm">
                          <p><span className="font-medium">Employee ID:</span> {salaryData.employeeId}</p>
                          <p><span className="font-medium">Department:</span> {salaryData.department}</p>
                          <p><span className="font-medium">Designation:</span> {selectedEmployee?.designation || selectedEmployee?.post || selectedEmployee?.role || 'Not Assigned'}</p>
                          <p><span className="font-medium">Basic Salary:</span> ₹{salaryData.basicSalary}</p>
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
                    <div className="bg-gradient-to-r from-amber-50 to-purple-50 p-6 rounded-lg mb-6">
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
                          <p className="text-lg font-bold text-amber-600">₹{calculations.grossSalary}</p>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm">
                          <p className="text-xs text-gray-600">Total Deductions</p>
                          <p className="text-lg font-bold text-red-600">-₹{calculations.totalDeductions}</p>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm">
                          <p className="text-xs text-gray-600">Advance Deduction</p>
                          <p className="text-lg font-bold text-orange-600">-₹{salaryData.advance}</p>
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
                      className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
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
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl w-full max-w-3xl mx-4 my-8 border border-white/20">
              <div className="p-8">
                <div className="text-center mb-6 border-b-2 border-gray-300 pb-4">
                  <h2 className="text-3xl font-bold text-gray-800">SALARY SLIP</h2>
                  <p className="text-gray-600 mt-2">Month: {salaryData.month + '/' + salaryData.year}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <p className="text-gray-600">Employee ID: <span className="font-semibold text-gray-800">{salaryData.employeeId}</span></p>
                    <p className="text-gray-600">Name: <span className="font-semibold text-gray-800">{salaryData.employeeName}</span></p>
                    <p className="text-gray-600">Department: <span className="font-semibold text-gray-800">{salaryData.department}</span></p>
                  </div>
                  <div>
                    <p className="text-gray-600">Designation: <span className="font-semibold text-gray-800">{selectedEmployee?.designation || selectedEmployee?.post || selectedEmployee?.role || 'Not Assigned'}</span></p>
                    <p className="text-gray-600">Basic Salary: <span className="font-semibold text-gray-800">₹{salaryData.basicSalary}</span></p>
                    <p className="text-gray-600">Generated On: <span className="font-semibold text-gray-800">{new Date().toLocaleDateString()}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3 bg-orange-100 p-2 rounded">Earnings</h4>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2 text-gray-700">Basic Salary</td>
                          <td className="py-2 text-right font-semibold">₹{salaryData.basicSalary || salaryData.earnedBasicSalary}</td>
                        </tr>
                        {salaryData.allowances && salaryData.allowances.map((allowance, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2 text-gray-700">{allowance.name}</td>
                            <td className="py-2 text-right font-semibold">₹{allowance.amount}</td>
                          </tr>
                        ))}
                        {(salaryData.overtimePay > 0 || (salaryData.overtimeHours > 0 && salaryData.overtimeRate > 0)) && (
                          <tr className="border-b">
                            <td className="py-2 text-gray-700">Overtime Pay</td>
                            <td className="py-2 text-right font-semibold">₹{salaryData.overtimePay || (salaryData.overtimeHours * salaryData.overtimeRate)}</td>
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
                    <div className="bg-amber-100 p-3 rounded">
                      <p className="text-gray-700">Gross Salary:</p>
                      <p className="text-amber-700">₹{salaryData.grossSalary}</p>
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
    </BranchLayout>
  );
};

export default GenerateSalary;