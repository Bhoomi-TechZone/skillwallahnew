import { useState, useEffect, useMemo } from 'react';
import BranchLayout from './BranchLayout';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const AdvanceReport = () => {
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // API helper function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  useEffect(() => {
    // 1. Try to load from cache immediately (Stale-While-Revalidate)
    const CACHE_KEY_STAFF = 'branch_advance_staff';
    const CACHE_KEY_DEPTS = 'branch_advance_depts';
    const CACHE_KEY_ADVANCES = 'branch_advance_list';

    const cachedStaff = localStorage.getItem(CACHE_KEY_STAFF);
    const cachedDepts = localStorage.getItem(CACHE_KEY_DEPTS);
    const cachedAdvances = localStorage.getItem(CACHE_KEY_ADVANCES);

    if (cachedStaff && cachedDepts && cachedAdvances) {
      try {
        setStaff(JSON.parse(cachedStaff));
        setDepartments(JSON.parse(cachedDepts));
        setAdvances(JSON.parse(cachedAdvances));
        setLoading(false); // Show cached data immediately
      } catch (e) { console.error('Error parsing cached data', e); }
    }

    fetchStaffAndDepartments();

    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing data...');
      fetchStaffAndDepartments();
    }, 30000); // 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []); // Only run once on mount

  useEffect(() => {
    console.log('🔄 useEffect triggered - staff:', staff.length, 'advances:', advances.length);
    if (staff.length > 0) {  // Process even if advances array is empty
      processAdvanceData();
    }
  }, [staff, advances]); // Remove filters from dependencies to prevent constant re-processing

  // Separate useEffect for filters
  useEffect(() => {
    if (staff.length > 0) {
      console.log('🔄 Filter changed, reprocessing data');
      processAdvanceData();
    }
  }, [selectedDepartment, searchQuery]);

  const fetchStaffAndDepartments = async () => {
    try {
      setLoading(true);

      // Fetch staff
      const staffResponse = await fetch(`${API_BASE_URL}/api/branch/staff`, {
        headers: getAuthHeaders(),
      });

      if (staffResponse.ok) {
        const staffData = await staffResponse.json();
        console.log('Staff data loaded:', staffData.staff?.length || 0, 'staff members');
        setStaff(staffData.staff || []);
      }

      // Fetch departments
      const deptResponse = await fetch(`${API_BASE_URL}/api/branch/departments`, {
        headers: getAuthHeaders(),
      });

      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        setDepartments(deptData.departments || []);
      }

      // Fetch advances
      const advancesResponse = await fetch(`${API_BASE_URL}/api/branch/advances`, {
        headers: getAuthHeaders(),
      });

      if (advancesResponse.ok) {
        const advancesData = await advancesResponse.json();
        console.log('Advances data loaded:', advancesData.advances?.length || 0, 'advance records');
        console.log('Sample advance records:', advancesData.advances?.slice(0, 3));
        setAdvances(advancesData.advances || []);

        // Cache fresh data
        localStorage.setItem('branch_advance_staff', JSON.stringify(staffData.staff || []));
        localStorage.setItem('branch_advance_depts', JSON.stringify(deptData.departments || []));
        localStorage.setItem('branch_advance_list', JSON.stringify(advancesData.advances || []));

        // Remove the timeout force processing as it can cause conflicts
        // The useEffect will handle processing when advances state updates
      } else {
        console.error('Failed to fetch advances:', advancesResponse.status);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAdvanceData = () => {
    console.log('🚀 Processing advance data - Staff:', staff.length, 'Advances:', advances.length);

    if (!staff || staff.length === 0) {
      console.log('❌ No staff data available');
      return;
    }

    let filteredStaff = staff;

    // Filter by department if selected
    if (selectedDepartment && selectedDepartment !== '') {
      filteredStaff = filteredStaff.filter(member => {
        const memberDepartment = member.department?.toLowerCase() || '';
        const selectedDept = selectedDepartment.toLowerCase();
        return memberDepartment === selectedDept;
      });
    }

    // Filter by search query (employee name)
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filteredStaff = filteredStaff.filter(member => {
        const employeeName = (member.employeeName || member.name || '').toLowerCase();
        const empId = (member.empId || '').toString().toLowerCase();
        return employeeName.includes(query) || empId.includes(query);
      });
    }

    // Use all advances without date filtering
    let filteredAdvances = advances;

    // Process staff data for advance report
    const processedData = filteredStaff.map((member) => {
      const salary = parseFloat(member.basicSalary) || 0;
      const staffId = member._id || member.id;
      const empId = member.empId;

      // Calculate advance due from filtered advances data with comprehensive matching
      const employeeAdvances = filteredAdvances.filter(adv => {
        // Check ALL possible matching criteria
        const matches = (
          adv.employee_id === staffId ||
          adv.employeeId === staffId ||
          adv.employee_id === empId ||
          adv.employeeId === empId ||
          adv.emp_id === empId ||
          String(adv.employee_id) === String(staffId) ||
          String(adv.employee_id) === String(empId) ||
          String(adv.employeeId) === String(staffId) ||
          String(adv.employeeId) === String(empId) ||
          parseInt(adv.employee_id) === parseInt(empId) ||
          parseInt(adv.employeeId) === parseInt(empId)
        );

        return matches;
      });

      // Only log for debugging when needed
      if (member.employeeName === 'Ram' && employeeAdvances.length > 0) {
        console.log(`Employee: ${member.employeeName}, ID: ${staffId}, EmpID: ${empId}`);
        console.log(`Found ${employeeAdvances.length} advance records:`, employeeAdvances);
      }

      const totalPaid = employeeAdvances
        .filter(adv => {
          const isPaid = (adv.advanceType === 'paid' || adv.advance_type === 'paid');
          const isActive = (adv.status === 'Active' || adv.status === 'active' || adv.status === 'Completed');
          return isPaid && isActive;
        })
        .reduce((sum, adv) => {
          const amount = parseFloat(adv.amount) || 0;
          return sum + amount;
        }, 0);

      const totalDeducted = employeeAdvances
        .filter(adv => {
          const isDeducted = (adv.advanceType === 'deducted' || adv.advance_type === 'deducted');
          const isActive = (adv.status === 'Active' || adv.status === 'active' || adv.status === 'Completed');
          return isDeducted && isActive;
        })
        .reduce((sum, adv) => {
          const amount = parseFloat(adv.amount) || 0;
          return sum + amount;
        }, 0);

      const advanceDue = Math.max(0, totalPaid - totalDeducted);

      // Only log for employees with advance due
      if (advanceDue > 0) {
        console.log(`Employee: ${member.employeeName}, Total Paid: ₹${totalPaid}, Total Deducted: ₹${totalDeducted}, Advance Due: ₹${advanceDue}`);
      }

      return {
        id: member._id || member.id,
        empId: member.empId,
        employeeName: member.employeeName || member.name || 'Unknown',
        department: member.department || 'N/A',
        salary: salary,
        advanceDue: advanceDue,
        totalPaid: totalPaid,
        totalDeducted: totalDeducted
      };
    });

    console.log('✅ Processed advance data for', processedData.length, 'staff members');
    console.log('📊 Total advance due across all staff:', processedData.reduce((sum, emp) => sum + emp.advanceDue, 0));

    // Only update if data has actually changed to prevent UI flicker
    setAdvanceData(prev => {
      if (JSON.stringify(prev) !== JSON.stringify(processedData)) {
        return processedData;
      }
      return prev;
    });
  };

  const handlePayAdvance = () => {
    // Open pay advance modal
    setIsPayAdvanceModalOpen(true);
  };

  const handlePayAdvanceSubmit = async () => {
    if (!payAdvanceForm.employeeId || !payAdvanceForm.amount) {
      alert('Please select an employee and enter amount');
      return;
    }

    try {
      // Find the selected employee to get both _id and empId
      const selectedEmployee = advanceData.find(emp => emp.id === payAdvanceForm.employeeId);

      if (!selectedEmployee) {
        alert('Selected employee not found. Please select again.');
        return;
      }

      console.log('Selected employee for advance payment:', selectedEmployee);

      // Prepare the payload with BOTH ID formats for backend compatibility
      const advancePayload = {
        employee_id: payAdvanceForm.employeeId, // MongoDB _id
        employeeId: payAdvanceForm.employeeId,  // Also send as employeeId  
        emp_id: selectedEmployee.empId,         // Also send empId for fallback
        employeeName: selectedEmployee.employeeName, // IMPORTANT: Backend needs this for success message
        amount: parseFloat(payAdvanceForm.amount),
        description: payAdvanceForm.description || `Advance payment to ${selectedEmployee.employeeName}`,
        paymentDate: payAdvanceForm.paymentDate, // Backend expects 'paymentDate' not 'payment_date'
        payment_date: payAdvanceForm.paymentDate, // Keep both for compatibility
        advance_type: 'paid', // Specify this is a payment
        advanceType: 'paid'   // Backend checks this field
      };

      console.log('Advance payment payload:', advancePayload);

      // Make API call to record the advance payment
      const response = await fetch(`${API_BASE_URL}/api/branch/advances`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(advancePayload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Advance payment response:', result);
        alert(result.message || `₹${payAdvanceForm.amount} advance paid to ${selectedEmployee.employeeName}`);

        // Immediate state update for better UX
        const updatedAdvanceData = advanceData.map(emp => {
          if (emp.id === payAdvanceForm.employeeId) {
            return {
              ...emp,
              advanceDue: emp.advanceDue + parseFloat(payAdvanceForm.amount)
            };
          }
          return emp;
        });
        setAdvanceData(updatedAdvanceData);

        // Reset form and close modal
        setPayAdvanceForm({
          employeeId: '',
          employeeName: '',
          amount: '',
          description: '',
          paymentDate: new Date().toISOString().split('T')[0]
        });
        setIsPayAdvanceModalOpen(false);

        // Also refresh the advances data from server
        setTimeout(() => {
          fetchStaffAndDepartments();
        }, 500);
      } else {
        const errorData = await response.json();
        console.error('Failed to pay advance:', errorData);
        alert(errorData.detail || errorData.message || 'Failed to pay advance');
      }
    } catch (error) {
      console.error('Error paying advance:', error);
      alert(`Failed to pay advance: ${error.message}`);
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    const employee = advanceData.find(emp => emp.id === employeeId);
    if (employee) {
      console.log('Selected employee:', employee);
      setPayAdvanceForm({
        ...payAdvanceForm,
        employeeId: employee.id,
        employeeName: employee.employeeName
      });
    }
  };

  const handleDeductAdvance = async (employee) => {
    console.log('🔧 Starting deduction for employee:', employee.employeeName, 'ID:', employee.id);

    if (employee.advanceDue <= 0) {
      alert('No advance due for this employee');
      return;
    }

    const amount = prompt(`Enter advance amount to deduct for ${employee.employeeName} (Max: ₹${employee.advanceDue}):`);
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      console.log('💰 Deduction amount entered:', amount);

      if (parseFloat(amount) > employee.advanceDue) {
        alert('Deduction amount cannot be more than advance due');
        return;
      }

      try {
        // Use the SAME comprehensive matching logic as processAdvanceData
        const activeAdvance = advances.find(adv => {
          const staffId = employee.id;
          const empId = employee.empId;

          // Check ALL possible matching criteria (same as processAdvanceData)
          const matches = (
            adv.employee_id === staffId ||
            adv.employeeId === staffId ||
            adv.employee_id === empId ||
            adv.employeeId === empId ||
            adv.emp_id === empId ||
            String(adv.employee_id) === String(staffId) ||
            String(adv.employee_id) === String(empId) ||
            String(adv.employeeId) === String(staffId) ||
            String(adv.employeeId) === String(empId) ||
            parseInt(adv.employee_id) === parseInt(empId) ||
            parseInt(adv.employeeId) === parseInt(empId)
          );

          const isPaid = (adv.advance_type === 'paid' || adv.advanceType === 'paid');
          const isActive = (adv.status === 'Active' || adv.status === 'active');

          return matches && isPaid && isActive;
        });

        if (!activeAdvance) {
          // If no existing advance found, create a new deduction entry
          const deductionPayload = {
            employee_id: employee.id,
            employeeId: employee.id,
            emp_id: employee.empId,
            employeeName: employee.employeeName,  // Add employee name to payload
            amount: parseFloat(amount),
            description: `Advance deduction for ${employee.employeeName}`,
            payment_date: new Date().toISOString().split('T')[0],
            deduction_date: new Date().toISOString().split('T')[0],
            deductionDate: new Date().toISOString().split('T')[0],
            advance_type: 'deducted',
            status: 'Active'
          };

          console.log('Creating deduction for:', employee.employeeName, 'Amount:', amount);

          const response = await fetch(`${API_BASE_URL}/api/branch/advances`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(deductionPayload)
          });

          if (response.ok) {
            const result = await response.json();
            console.log('Deduction API Response:', result);
            alert(`₹${amount} advance successfully deducted from ${employee.employeeName}`);

            // Immediate state update for better UX
            const updatedAdvanceData = advanceData.map(emp => {
              if (emp.id === employee.id) {
                return {
                  ...emp,
                  advanceDue: Math.max(0, emp.advanceDue - parseFloat(amount))
                };
              }
              return emp;
            });
            setAdvanceData(updatedAdvanceData);

            // Also refresh the advances data from server
            setTimeout(() => {
              fetchStaffAndDepartments();
            }, 500);
          } else {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error - Invalid JSON response' }));
            console.error('Failed to create advance deduction:', {
              status: response.status,
              statusText: response.statusText,
              errorData,
              requestPayload: deductionPayload
            });
            alert(`Failed to deduct advance: ${errorData.detail || errorData.message || 'Unknown error'}`);
          }

          return;
        }

        // Check if the advance has remaining amount field
        const remainingAmount = activeAdvance.remaining_amount ?? activeAdvance.remainingAmount ?? parseFloat(activeAdvance.amount || 0);

        if (parseFloat(amount) > remainingAmount) {
          alert(`Deduction amount cannot be more than remaining advance (₹${remainingAmount})`);
          return;
        }

        // If advance found, use the existing deduction endpoint
        const advanceId = activeAdvance._id || activeAdvance.id;
        console.log('Using existing advance for deduction. Advance ID:', advanceId);
        console.log('Full advance object:', activeAdvance);
        console.log('Deducting for employee:', employee.employeeName, 'Amount:', amount);

        const deductionPayload = {
          amount: parseFloat(amount),
          deduction_date: new Date().toISOString().split('T')[0],
          deductionDate: new Date().toISOString().split('T')[0],
          description: `Advance deduction for ${employee.employeeName}`,
          employeeName: employee.employeeName,
          employee_id: employee.id,
          employeeId: employee.id,
          emp_id: employee.empId,
          status: 'Active',
          advance_type: 'deducted',
          advanceType: 'deducted',
          remaining_amount: remainingAmount - parseFloat(amount)
        };

        console.log('Deduction payload:', deductionPayload);
        console.log('Active advance details:', {
          id: activeAdvance._id || activeAdvance.id,
          remaining_amount: activeAdvance.remaining_amount,
          amount: activeAdvance.amount,
          calculated_remaining: remainingAmount
        });

        const response = await fetch(`${API_BASE_URL}/api/branch/advances/${advanceId}/deduct`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(deductionPayload)
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Deduction API Response:', result);
          alert(`₹${amount} advance successfully deducted from ${employee.employeeName}`);

          // Immediate state update for better UX
          const updatedAdvanceData = advanceData.map(emp => {
            if (emp.id === employee.id) {
              return {
                ...emp,
                advanceDue: Math.max(0, emp.advanceDue - parseFloat(amount))
              };
            }
            return emp;
          });
          setAdvanceData(updatedAdvanceData);

          // Also refresh the advances data from server
          setTimeout(() => {
            fetchStaffAndDepartments();
          }, 500);
        } else {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error - Invalid JSON response' }));
          console.error('Failed to deduct advance:', {
            status: response.status,
            statusText: response.statusText,
            errorData,
            requestPayload: deductionPayload
          });
          alert(`Failed to deduct advance: ${errorData.detail || errorData.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error deducting advance:', error);
        alert('Failed to deduct advance');
      }
    }
  };

  return (
    <BranchLayout>
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="flex flex-col md:flex-row md:items-center mb-6">
          <div className="flex items-center mb-2 md:mb-0">
            <span className="text-2xl mr-3">📋</span>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">MANAGE STAFF ADVANCE</h1>
              <p className="text-xs md:text-sm text-green-600 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Auto-refreshing every 30s
              </p>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <span className="text-gray-700 font-medium hidden md:inline">Filters:</span>

            {/* Department Filter */}
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto">
              <label className="text-sm text-gray-600 md:hidden">Department:</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto flex-grow">
              <label className="text-sm text-gray-600 md:hidden">Search:</label>
              <input
                type="text"
                placeholder="Search by employee name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <button
              onClick={handlePayAdvance}
              className="w-full md:w-auto px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Pay Advance
            </button>
          </div>
        </div>

        {/* Advance Table (Desktop) */}
        <div className="bg-white rounded-lg shadow overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">
                    SNo.
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">
                    Employees
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">
                    Advance Due
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">
                    Deduct Advance This Month
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 hidden md:table-row-group">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <span className="text-2xl mb-2">⏳</span>
                        <p>Loading staff data...</p>
                      </div>
                    </td>
                  </tr>
                ) : advanceData.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <span className="text-2xl mb-2">👥</span>
                        <p>No staff members found.</p>
                        <p className="text-sm mt-1">Please add staff members or select a different department.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  advanceData.map((record, index) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {record.employeeName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.department} • ID: {record.empId}
                        </div>
                        <div className="text-sm text-orange-600">
                          Salary: ₹{record.salary?.toLocaleString() || '0'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="text-lg font-bold text-blue-600">
                          ₹{record.advanceDue?.toLocaleString() || '0'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Paid: ₹{record.totalPaid?.toLocaleString() || '0'} |
                          Deducted: ₹{record.totalDeducted?.toLocaleString() || '0'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDeductAdvance(record)}
                          className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          Deduct Advance
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View (Cards) */}
        <div className="md:hidden space-y-4">
          {loading && advanceData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="flex flex-col items-center">
                <span className="text-2xl mb-2">⏳</span>
                <p>Loading staff data...</p>
              </div>
            </div>
          ) : advanceData.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-sm">
              <div className="flex flex-col items-center">
                <span className="text-2xl mb-2">👥</span>
                <p>No staff members found.</p>
              </div>
            </div>
          ) : (
            advanceData.map((record) => (
              <div key={record.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{record.employeeName}</h3>
                    <p className="text-xs text-gray-500">{record.department}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">₹{record.advanceDue?.toLocaleString() || '0'}</div>
                    <p className="text-xs text-gray-500">Due</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 text-xs bg-gray-50 p-2 rounded">
                  <div>
                    <span className="text-gray-500 block">ID:</span>
                    <span className="font-medium">{record.empId}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Salary:</span>
                    <span className="font-medium text-orange-600">₹{record.salary?.toLocaleString() || '0'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Paid:</span>
                    <span className="font-medium">₹{record.totalPaid?.toLocaleString() || '0'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Deducted:</span>
                    <span className="font-medium">₹{record.totalDeducted?.toLocaleString() || '0'}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeductAdvance(record)}
                  className="w-full px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm font-medium"
                >
                  Deduct Advance This Month
                </button>
              </div>
            ))
          )}
        </div>

        {/* Summary Section */}
        {!loading && advanceData.length > 0 && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-blue-800">Total Staff</h3>
                <p className="text-2xl font-bold text-blue-600">{advanceData.length}</p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-blue-800">Total Salary</h3>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{advanceData.reduce((sum, record) => sum + (record.salary || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-blue-800">Total Advance Due</h3>
                <p className="text-2xl font-bold text-blue-600">
                  ₹{advanceData.reduce((sum, record) => sum + (record.advanceDue || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-blue-800">Department</h3>
                <p className="text-2xl font-bold text-blue-600">{selectedDepartment || 'All'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pay Advance Modal */}
        {isPayAdvanceModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl w-full max-w-md mx-4 shadow-2xl border border-white/20">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Pay Advance to Employee</h3>
                  <button
                    onClick={() => setIsPayAdvanceModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="space-y-4">
                  {/* Employee Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Employee *
                    </label>
                    <select
                      value={payAdvanceForm.employeeId}
                      onChange={(e) => handleEmployeeSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- Select Employee --</option>
                      {advanceData.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.employeeName} ({employee.department}) - ₹{employee.salary?.toLocaleString()}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setIsPayAdvanceModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayAdvanceSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Pay Advance
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BranchLayout>
  );
};

export default AdvanceReport;