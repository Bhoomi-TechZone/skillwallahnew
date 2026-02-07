import { useState, useEffect } from 'react';
import BranchLayout from './BranchLayout';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const ManageEmployee = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // API helper function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Fetch staff from API
  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/api/branch/staff`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const staffList = data.staff || [];
        setEmployees(staffList);
      } else {
        throw new Error(data.message || 'Failed to fetch staff');
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      setError('Failed to fetch staff. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load staff on component mount
  useEffect(() => {
    fetchStaff();
  }, []);

  // Handle edit button click
  const handleEditClick = (employee) => {
    console.log('Edit button clicked with employee:', employee);

    // Safety check for employee object
    if (!employee) {
      console.error('No employee object provided');
      setError('Invalid employee data');
      return;
    }

    // Get the employee ID safely
    const employeeId = employee._id || employee.id;
    console.log('Extracted employee ID:', employeeId);

    if (!employeeId) {
      console.error('Employee ID is missing from employee object:', employee);
      setError('Employee ID is missing');
      return;
    }

    console.log('Setting editing employee to:', employeeId);

    setEditingEmployee(employeeId);
    setEditFormData({
      name: employee.name || employee.employeeName || '',
      contactNo: employee.phone || employee.contactNo || '',
      basicSalary: employee.basicSalary ? employee.basicSalary.toString().replace(' Rs/-', '') : '',
      department: employee.department || ''
    });
    setError('');
    setSuccess('');

    console.log('Edit form data set:', {
      name: employee.name || employee.employeeName || '',
      contactNo: employee.phone || employee.contactNo || '',
      basicSalary: employee.basicSalary ? employee.basicSalary.toString().replace(' Rs/-', '') : '',
      department: employee.department || ''
    });
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    try {
      console.log('Save edit called with editingEmployee:', editingEmployee);
      console.log('Current editFormData:', editFormData);

      // Check if we have a valid editing employee ID
      if (!editingEmployee) {
        console.error('No editingEmployee set when save was called');
        setError('No employee selected for editing. Please try clicking edit again.');
        return;
      }

      // Validation
      if (!editFormData.name || !editFormData.contactNo || !editFormData.basicSalary || !editFormData.department) {
        setError('All fields are required');
        return;
      }

      if (!/^[0-9]{10}$/.test(editFormData.contactNo)) {
        setError('Contact number must be 10 digits');
        return;
      }

      // Find the employee being edited
      const employeeToEdit = employees.find(emp => {
        const empId = emp._id || emp.id;
        return empId && empId === editingEmployee;
      });

      if (!employeeToEdit) {
        setError('Employee not found or invalid employee ID');
        console.error('Employee to edit not found:', { editingEmployee, employees });
        return;
      }

      // Additional safety check for employee ID
      const employeeId = employeeToEdit._id || employeeToEdit.id;
      if (!employeeId) {
        setError('Employee ID is missing');
        return;
      }

      // Prepare update data in the format expected by the API
      const updateData = {
        empId: employeeToEdit.empId || '',
        employeeName: editFormData.name,
        phone: editFormData.contactNo,
        basicSalary: editFormData.basicSalary,
        department: editFormData.department,
        // Keep existing data
        email: employeeToEdit.email || '',
        address: employeeToEdit.address || '',
        dateOfJoining: employeeToEdit.dateOfJoining || '',
        gender: employeeToEdit.gender || 'Male',
        ta: employeeToEdit.ta || '',
        da: employeeToEdit.da || '',
        hra: employeeToEdit.hra || '',
        casualLeave: employeeToEdit.casualLeave || ''
      };

      console.log('Updating employee:', { employeeId, updateData });

      const response = await fetch(`${API_BASE_URL}/api/branch/staff/${employeeId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchStaff(); // Refresh the list
        setEditingEmployee(null);
        setEditFormData({});
        setSuccess('Employee updated successfully');
        setError('');

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to update employee');
      }
    } catch (err) {
      console.error('Error updating staff:', err);
      setError('Failed to update employee. Please try again.');
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setEditFormData({});
    setError('');
  };

  // Handle delete employee
  const handleDelete = async (employeeId) => {
    // Safety check for employee ID
    if (!employeeId) {
      setError('Invalid employee ID');
      return;
    }

    const employee = employees.find(emp => (emp._id || emp.id) === employeeId);

    if (!employee) {
      setError('Employee not found');
      return;
    }

    const employeeName = employee.name || employee.employeeName || 'Unknown Employee';

    if (!window.confirm(`Are you sure you want to delete employee "${employeeName}"?`)) {
      return;
    }

    try {
      console.log('Deleting employee:', { employeeId, employee });

      const response = await fetch(`${API_BASE_URL}/api/branch/staff/${employeeId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        await fetchStaff(); // Refresh the list
        setSuccess('Employee deleted successfully');
        setError('');

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to delete employee');
      }
    } catch (err) {
      console.error('Error deleting staff:', err);
      setError('Failed to delete employee. Please try again.');
    }
  };

  return (
    <BranchLayout>
      <div className="p-6">
        <div className="flex items-center mb-6">
          <span className="text-2xl mr-3">📋</span>
          <h1 className="text-2xl font-bold text-gray-800">MANAGE STAFF</h1>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-orange-600 text-sm">{success}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-2 text-gray-600">Loading staff...</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-gray-600">Our Staff ({employees.length}):</p>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-800 text-white">
                      <th className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">
                        Emp ID
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">
                        Employees
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">
                        Contact No
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">
                        Basic Salary
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                          <div className="text-center">
                            <p className="text-lg font-medium">No staff members found</p>
                            <p className="text-sm">No employees are currently available</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      employees.map((employee, index) => {
                        const employeeId = employee._id || employee.id;
                        const employeeName = employee.name || employee.employeeName || 'Unknown';
                        const contactNo = employee.phone || employee.contactNo || '';
                        const salary = employee.basicSalary ?
                          (typeof employee.basicSalary === 'string' ? employee.basicSalary : `${employee.basicSalary} Rs/-`)
                          : '';

                        // Skip rendering if employee ID is missing
                        if (!employeeId) {
                          console.warn('Skipping employee with missing ID:', employee);
                          return null;
                        }

                        return (
                          <tr key={employeeId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {employee.empId || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {editingEmployee === employeeId ? (
                                <input
                                  type="text"
                                  value={editFormData.name || ''}
                                  onChange={(e) => handleInputChange('name', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                />
                              ) : (
                                employeeName
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {editingEmployee === employeeId ? (
                                <input
                                  type="text"
                                  value={editFormData.contactNo || ''}
                                  onChange={(e) => handleInputChange('contactNo', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                  maxLength="10"
                                />
                              ) : (
                                contactNo
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {editingEmployee === employeeId ? (
                                <input
                                  type="text"
                                  value={editFormData.basicSalary || ''}
                                  onChange={(e) => handleInputChange('basicSalary', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                  placeholder="Enter salary amount"
                                />
                              ) : (
                                salary
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {editingEmployee === employeeId ? (
                                <select
                                  value={editFormData.department || ''}
                                  onChange={(e) => handleInputChange('department', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                >
                                  <option value="">Select Department</option>
                                  <option value="Teaching">Teaching</option>
                                  <option value="Administration">Administration</option>
                                  <option value="IT Support">IT Support</option>
                                  <option value="Accountant">Accountant</option>
                                  <option value="Marketing">Marketing</option>
                                  <option value="HR">HR</option>
                                </select>
                              ) : (
                                employee.department
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {editingEmployee === employeeId ? (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('Save button clicked, editingEmployee:', editingEmployee);
                                      handleSaveEdit();
                                    }}
                                    className="text-orange-600 hover:text-orange-800 px-2 py-1 rounded"
                                    title="Save"
                                    type="button"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleCancelEdit();
                                    }}
                                    className="text-gray-600 hover:text-gray-800 px-2 py-1 rounded"
                                    title="Cancel"
                                    type="button"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('Edit button clicked for employee:', employee);
                                      handleEditClick(employee);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded"
                                    title="Edit"
                                    type="button"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDelete(employeeId);
                                    }}
                                    className="text-red-600 hover:text-red-800 px-2 py-1 rounded"
                                    title="Delete"
                                    type="button"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </BranchLayout>
  );
};

export default ManageEmployee;