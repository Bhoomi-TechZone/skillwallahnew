import React, { useState, useEffect, useCallback, memo } from 'react';
import BranchLayout from '../../components/Branch/BranchLayout';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaUsers,
  FaTimes,
  FaSpinner,
  FaToggleOn,
  FaToggleOff,
  FaUser,
  FaUserPlus,
  FaEye,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaRupeeSign
} from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Modal component - moved outside to prevent re-creation
const Modal = React.memo(({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-transparent bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white bg-opacity-95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-6xl mx-4 max-h-[95vh] overflow-hidden border border-gray-200">
        <div className="flex justify-between items-center p-8 border-b-2 bg-gradient-to-r from-amber-600 via-purple-600 to-indigo-700">
          <h3 className="text-2xl font-bold text-white flex items-center">
            <FaUserPlus className="mr-3 text-3xl" />
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-all duration-200 p-3 hover:bg-white/20 rounded-full hover:rotate-90 hover:scale-110"
          >
            <FaTimes size={24} />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
});

// Error message component
const ErrorMessage = ({ error }) => {
  if (!error) return null;
  return <p className="text-red-500 text-sm mt-1">{error}</p>;
};

// Stable Input Component with forced re-mount prevention
const StableInput = React.memo(({ label, type = 'text', name, value, onChange, placeholder, required = false, step }) => {
  const handleChange = React.useCallback((e) => {
    onChange(e);
  }, [onChange]);

  return (
    <div className="input-wrapper">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={handleChange}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
        placeholder={placeholder}
        required={required}
        step={step}
        autoComplete="off"
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return prevProps.value === nextProps.value &&
    prevProps.name === nextProps.name &&
    prevProps.label === nextProps.label;
});

// Stable Form Component
const AddStaffForm = React.memo(({ formData, handleInputChange, departments, onSubmit, submitting }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <form onSubmit={onSubmit} className="space-y-8">

        {/* Personal Information Section */}
        <div className="border-l-4 border-amber-500 pl-6 bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
            <FaUser className="mr-2 text-amber-500" />
            Personal Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StableInput
              label="EMP ID (User Name)"
              name="empId"
              value={formData.empId}
              onChange={handleInputChange}
              placeholder="webadmin"
              required
            />

            <StableInput
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter secure password"
              required
            />

            <StableInput
              label="Employee Name"
              name="employeeName"
              value={formData.employeeName}
              onChange={handleInputChange}
              placeholder="Enter full name"
              required
            />

            <StableInput
              label="Phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+91 12345 67890"
              required
            />

            {/* Continue with existing form structure for other fields... */}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex space-x-4 pt-6">
          <button
            type="button"
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-600 to-purple-600 text-white rounded-xl hover:from-amber-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {submitting ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Adding Staff...
              </>
            ) : (
              'Submit'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.formData) === JSON.stringify(nextProps.formData) &&
    prevProps.submitting === nextProps.submitting;
});

const ManageStaff = () => {
  // State management
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form data for add/edit staff
  const [formData, setFormData] = useState({
    empId: '',
    password: '',
    employeeName: '',
    department: '',
    gender: 'Male',
    phone: '',
    email: '',
    address: '',
    dateOfJoining: '',
    basicSalary: '',
    ta: '',
    da: '',
    hra: '',
    casualLeave: '',
    status: 'Active'
  });

  // Validation function
  const validateForm = () => {
    const errors = {};

    // EMP ID validation
    if (!formData.empId || formData.empId.trim() === '') {
      errors.empId = 'Employee ID is required';
    } else if (formData.empId.length < 2) {
      errors.empId = 'Employee ID must be at least 2 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.empId)) {
      errors.empId = 'Employee ID can only contain letters, numbers, hyphens and underscores';
    }

    // Password validation (only for add, not edit)
    if (!selectedStaff && (!formData.password || formData.password.trim() === '')) {
      errors.password = 'Password is required';
    } else if (!selectedStaff && formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    // Employee Name validation
    if (!formData.employeeName || formData.employeeName.trim() === '') {
      errors.employeeName = 'Employee name is required';
    } else if (formData.employeeName.trim().length < 2) {
      errors.employeeName = 'Name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s.]+$/.test(formData.employeeName)) {
      errors.employeeName = 'Name can only contain letters, spaces and periods';
    }

    // Department validation
    if (!formData.department || formData.department.trim() === '') {
      errors.department = 'Department is required';
    }

    // Phone validation
    if (!formData.phone || formData.phone.trim() === '') {
      errors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      errors.phone = 'Phone number must be 10 digits';
    }

    // Email validation
    if (!formData.email || formData.email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Address validation
    if (!formData.address || formData.address.trim() === '') {
      errors.address = 'Address is required';
    } else if (formData.address.trim().length < 10) {
      errors.address = 'Address must be at least 10 characters';
    }

    // Date of Joining validation
    if (!formData.dateOfJoining || formData.dateOfJoining.trim() === '') {
      errors.dateOfJoining = 'Date of joining is required';
    }

    // Basic Salary validation - removed to allow any value including zero
    // No validation needed - salary can be any amount

    // T.A validation (optional but if provided must be valid)
    if (formData.ta && formData.ta !== '') {
      const taValue = parseFloat(formData.ta);
      if (isNaN(taValue) || taValue < 0 || taValue > 100) {
        errors.ta = 'T.A must be between 0 and 100';
      }
    }

    // D.A validation
    if (formData.da && formData.da !== '') {
      const daValue = parseFloat(formData.da);
      if (isNaN(daValue) || daValue < 0 || daValue > 100) {
        errors.da = 'D.A must be between 0 and 100';
      }
    }

    // H.R.A validation
    if (formData.hra && formData.hra !== '') {
      const hraValue = parseFloat(formData.hra);
      if (isNaN(hraValue) || hraValue < 0 || hraValue > 100) {
        errors.hra = 'H.R.A must be between 0 and 100';
      }
    }

    // Casual Leave validation
    if (formData.casualLeave && formData.casualLeave !== '') {
      const leaveValue = parseFloat(formData.casualLeave);
      if (isNaN(leaveValue) || leaveValue < 0 || leaveValue > 30) {
        errors.casualLeave = 'Casual leave must be between 0 and 30 days';
      }
    }

    return errors;
  };

  // API helper function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    console.log('Auth Token Length:', token?.length);
    console.log('Auth Token Preview:', token?.substring(0, 50) + '...');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Fetch staff from API
  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = `${API_BASE_URL}/api/branch/staff`;
      console.log('Fetching staff from URL:', apiUrl);
      console.log('API_BASE_URL:', API_BASE_URL);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      console.log('Response Status:', response.status);
      console.log('Response OK:', response.ok);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Staff API Response:', data);
      console.log('Staff Array Length:', data.staff?.length);
      console.log('First Staff Member:', data.staff?.[0]);

      if (data.success) {
        const staffList = data.staff || [];
        console.log('Setting staff list with', staffList.length, 'members');
        setStaff(staffList);
        // Cache fresh data
        localStorage.setItem('branch_staff_list', JSON.stringify(staffList));
      } else {
        console.error('API returned error:', data.message);
        throw new Error(data.message || 'Failed to fetch staff');
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      setError(error.message);
      // Fallback demo data
      const demoStaff = [
        {
          id: '1',
          empId: 'newtonbiswas111',
          employeeName: 'Newton',
          phone: '8967900822',
          basicSalary: '20000',
          department: 'ACCOUNTANT',
          status: 'Inactive'
        },
        {
          id: '2',
          empId: '203',
          employeeName: 'Soyel Ali',
          phone: '9332838423',
          basicSalary: '40000',
          department: 'Accountant (RideSphere)',
          status: 'Inactive'
        },
        {
          id: '3',
          empId: '202101',
          employeeName: 'NAVDEEP SINHA',
          phone: '9695579555',
          basicSalary: '15000',
          department: 'MANAGER',
          status: 'Active'
        },
        {
          id: '4',
          empId: '101',
          employeeName: 'PANKAJ KUMAR GOSWAMI',
          phone: '9198516444',
          basicSalary: '40000',
          department: 'MANAGER',
          status: 'Active'
        }
      ];
      setStaff(demoStaff);
    } finally {
      setLoading(false);
    }
  };

  // Fetch departments for dropdown
  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/branch/departments`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDepartments(data.departments || []);
        }
      } else {
        // Fallback demo departments
        setDepartments([
          { id: '1', name: 'MANAGER' },
          { id: '2', name: 'ACCOUNTANT' },
          { id: '3', name: 'HR' },
          { id: '4', name: 'DEVELOPER' },
          { id: '5', name: 'DESIGNER' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Set fallback departments
      setDepartments([
        { id: '1', name: 'MANAGER' },
        { id: '2', name: 'ACCOUNTANT' },
        { id: '3', name: 'HR' },
        { id: '4', name: 'DEVELOPER' },
        { id: '5', name: 'DESIGNER' }
      ]);
    }
  };

  // Add new staff
  const handleAddStaff = useCallback(async () => {
    try {
      // Validate form
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        // Show first error
        const firstError = Object.values(errors)[0];
        alert(`Validation Error: ${firstError}`);
        return;
      }

      setValidationErrors({});
      setSubmitting(true);

      // Clean and trim data
      const cleanedData = {
        ...formData,
        empId: formData.empId.trim(),
        employeeName: formData.employeeName.trim(),
        department: formData.department.trim(),
        phone: formData.phone.replace(/[\s-]/g, ''),
        email: formData.email.trim().toLowerCase(),
        address: formData.address.trim()
      };

      const response = await fetch(`${API_BASE_URL}/api/branch/staff`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(cleanedData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchStaff(); // Refresh the list
        setIsAddModalOpen(false);
        resetForm();
        alert('Staff member added successfully!');
      } else {
        alert(data.message || 'Failed to add staff member');
      }
    } catch (error) {
      console.error('Error adding staff:', error);
      alert('Failed to add staff member');
    } finally {
      setSubmitting(false);
    }
  }, [formData]);

  // Handle form submit for Add Staff
  const handleAddStaffSubmit = useCallback((e) => {
    e.preventDefault();
    handleAddStaff();
  }, [handleAddStaff]);

  // Handle form submit for Edit Staff  
  const handleEditStaffSubmit = (e) => {
    e.preventDefault();
    console.log('Edit form submitted, selectedStaff:', selectedStaff);
    handleEditStaff();
  };

  // Edit staff
  const handleEditStaff = async () => {
    try {
      setSubmitting(true);

      console.log('handleEditStaff called with selectedStaff:', selectedStaff);

      // Safety check for selectedStaff
      if (!selectedStaff) {
        console.error('No staff member selected for editing');
        alert('No staff member selected for editing. Please try clicking edit again.');
        return;
      }

      // Safety check for staff ID
      const staffId = selectedStaff._id || selectedStaff.id;
      if (!staffId) {
        console.error('Staff ID is missing:', selectedStaff);
        alert('Staff ID is missing');
        return;
      }

      console.log('Updating staff:', { staffId, selectedStaff, formData });

      const response = await fetch(`${API_BASE_URL}/api/branch/staff/${staffId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchStaff(); // Refresh the list
        setIsEditModalOpen(false);
        setSelectedStaff(null);
        resetForm();
        alert('Staff member updated successfully!');
      } else {
        alert(data.message || 'Failed to update staff member');
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      alert('Failed to update staff member');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete staff
  const handleDeleteStaff = async (member) => {
    if (!confirm(`Are you sure you want to delete staff member "${member.employeeName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/branch/staff/${member._id || member.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        await fetchStaff(); // Refresh the list
        alert('Staff member deleted successfully!');
      } else {
        alert(data.message || 'Failed to delete staff member');
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Failed to delete staff member');
    }
  };

  // Toggle staff status
  const handleToggleStatus = async (member) => {
    try {
      const newStatus = member.status === 'Active' ? 'Inactive' : 'Active';

      const response = await fetch(`${API_BASE_URL}/api/branch/staff/${member._id || member.id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchStaff(); // Refresh the list
        alert(`Staff status changed to ${newStatus}`);
      } else {
        alert(data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update status');
    }
  };

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      empId: '',
      password: '',
      employeeName: '',
      department: '',
      gender: 'Male',
      phone: '',
      email: '',
      address: '',
      dateOfJoining: '',
      basicSalary: '',
      ta: '',
      da: '',
      hra: '',
      casualLeave: '',
      status: 'Active'
    });
    setValidationErrors({});
  }, []);

  // Open add modal
  const openAddModal = useCallback(() => {
    resetForm();
    setIsAddModalOpen(true);
  }, [resetForm]);

  // Close add modal  
  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  // Close edit modal
  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedStaff(null); // Clear selected staff when closing modal
    resetForm(); // Reset form data
  }, [resetForm]);

  // Open view modal
  const openViewModal = useCallback((member) => {
    if (!member) {
      console.error('No member data provided to view modal');
      alert('Invalid staff member data');
      return;
    }
    setSelectedStaff(member);
    setIsViewModalOpen(true);
  }, []);

  // Close view modal
  const closeViewModal = useCallback(() => {
    setIsViewModalOpen(false);
    setSelectedStaff(null);
  }, []);

  // Open edit modal
  const openEditModal = useCallback((member) => {
    // Safety check for member object
    if (!member) {
      console.error('No member data provided to edit modal');
      alert('Invalid staff member data');
      return;
    }

    console.log('Opening edit modal for member:', member);

    setSelectedStaff(member);
    setFormData({
      empId: member.empId || '',
      password: '', // Don't populate password for security
      employeeName: member.employeeName || '',
      department: member.department || '',
      gender: member.gender || 'Male',
      phone: member.phone || '',
      email: member.email || '',
      address: member.address || '',
      dateOfJoining: member.dateOfJoining || '',
      basicSalary: member.basicSalary || '',
      ta: member.ta || '',
      da: member.da || '',
      hra: member.hra || '',
      casualLeave: member.casualLeave || '',
      status: member.status || 'Active'
    });
    setIsEditModalOpen(true);
  }, []);

  // Handle input changes
  const handleInputChange = React.useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [validationErrors]);

  // Pagination calculations
  const totalPages = Math.ceil(staff.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStaff = staff.slice(startIndex, endIndex);

  // Reset to first page when staff data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [staff.length]);

  // Load data on component mount
  // Load data on component mount
  useEffect(() => {
    // 1. Try to load from cache immediately (Stale-While-Revalidate)
    const CACHE_KEY = 'branch_staff_list';
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (cachedData) {
      try {
        setStaff(JSON.parse(cachedData));
        setLoading(false); // Show cached data immediately
      } catch (e) { console.error('Error parsing cached data', e); }
    }

    // 2. Fetch fresh data
    const loadData = async () => {
      // Don't set loading true if we already showed cached data
      if (!cachedData) setLoading(true);
      await fetchStaff();
      await fetchDepartments();
    };

    loadData();
  }, []);



  if (loading && staff.length === 0) {
    return (
      <BranchLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FaSpinner className="animate-spin text-4xl text-amber-600 mb-4 mx-auto" />
            <p className="text-lg text-gray-600">Loading staff...</p>
          </div>
        </div>
      </BranchLayout>
    );
  }

  return (
    <BranchLayout>
      <div className="p-6 min-h-screen bg-gradient-to-br from-slate-50 to-amber-50">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-amber-600 to-purple-600 rounded-lg flex items-center justify-center">
                <FaUsers className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-1">MANAGE STAFF</h1>
                <p className="text-gray-600">Our Staff :</p>
              </div>
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-amber-600 to-purple-600 text-white rounded-xl hover:from-amber-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 w-full md:w-auto"
            >
              <FaPlus className="mr-2" />
              Add New Employees
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Mobile View (Cards) */}
        <div className="md:hidden space-y-4">
          {paginatedStaff.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-2xl shadow-sm">
              <FaUsers className="text-4xl mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No staff found</p>
            </div>
          ) : (
            paginatedStaff.map((member) => (
              <div key={member.id || member._id} className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{member.employeeName}</h3>
                    <p className="text-xs text-gray-500">ID: {member.empId}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${member.status === 'Active'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {member.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4 text-sm border-t border-b border-gray-50 py-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Department:</span>
                    <span className="font-medium text-gray-800">{member.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span className="font-medium text-gray-800">{member.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Salary:</span>
                    <span className="font-medium text-gray-800">₹{member.basicSalary}</span>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button onClick={() => openViewModal(member)} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><FaEye /></button>
                  <button onClick={() => openEditModal(member)} className="p-2 text-amber-600 bg-amber-50 rounded-lg"><FaEdit /></button>
                  <button onClick={() => handleToggleStatus(member)} className="p-2 text-orange-600 bg-orange-50 rounded-lg">
                    {member.status === 'Active' ? <FaToggleOn /> : <FaToggleOff />}
                  </button>
                  <button onClick={() => handleDeleteStaff(member)} className="p-2 text-red-600 bg-red-50 rounded-lg"><FaTrash /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Staff Table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-amber-600 to-purple-600 text-white">
                <tr>
                  <th className="px-4 py-4 text-left text-sm font-semibold">Emp ID</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold">Employees</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold">Contact No</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold">Basic Salary</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold">Department</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {console.log('Table Render - Staff Length:', staff.length, 'Paginated Length:', paginatedStaff.length, 'Current Page:', currentPage)}
                {paginatedStaff.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <FaUsers className="text-4xl mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No staff members found</p>
                      <p className="text-sm">Add your first staff member to get started</p>
                    </td>
                  </tr>
                ) : (
                  paginatedStaff.map((member, index) => {
                    console.log(`Rendering staff member ${startIndex + index}:`, member);
                    return (
                      <tr key={member._id || member.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-4 py-4">
                          <span className="font-medium text-gray-900">{member.empId}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {member.employeeName?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="text-gray-700 font-medium">{member.employeeName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-gray-600">{member.phone}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="bg-orange-100 text-orange-800 text-sm font-semibold px-3 py-1 rounded-full">
                            {member.basicSalary} Rs/-
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="bg-amber-100 text-amber-800 text-sm font-semibold px-3 py-1 rounded-full">
                            {member.department}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => openViewModal(member)}
                              className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-full transition-colors"
                              title="View Profile"
                            >
                              <FaUser className="text-sm" />
                            </button>

                            <button
                              onClick={() => openEditModal(member)}
                              className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-full transition-colors"
                              title="Edit Staff"
                            >
                              <FaEdit className="text-sm" />
                            </button>

                            <button
                              onClick={() => handleToggleStatus(member)}
                              className={`text-white p-2 rounded-full transition-colors ${member.status === 'Active'
                                ? 'bg-orange-500 hover:bg-orange-600'
                                : 'bg-gray-500 hover:bg-gray-600'
                                }`}
                              title={`Status: ${member.status}`}
                            >
                              <span className="text-xs font-bold">
                                {member.status === 'Active' ? 'On' : 'Off'}
                              </span>
                            </button>

                            <button
                              onClick={() => handleDeleteStaff(member)}
                              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                              title="Delete Staff"
                            >
                              <FaTrash className="text-sm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {staff.length > itemsPerPage && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                {/* Pagination Info */}
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, staff.length)}</span> of{' '}
                  <span className="font-medium">{staff.length}</span> results
                </div>

                {/* Pagination Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                      // Show first page, last page, current page, and pages around current page
                      const showPage = pageNum === 1 ||
                        pageNum === totalPages ||
                        Math.abs(pageNum - currentPage) <= 1;

                      if (!showPage) {
                        // Show ellipsis
                        if ((pageNum === 2 && currentPage > 4) ||
                          (pageNum === totalPages - 1 && currentPage < totalPages - 3)) {
                          return (
                            <span key={pageNum} className="px-3 py-2 text-sm text-gray-400">
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage === pageNum
                            ? 'bg-amber-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add Staff Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          title="Add Staff"
        >
          <div className="bg-white rounded-xl shadow-lg p-6">
            <form onSubmit={handleAddStaffSubmit} className="space-y-8">

              {/* Personal Information Section */}
              <div className="border-l-4 border-amber-500 pl-6 bg-white rounded-lg shadow-sm p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                  <FaUser className="mr-2 text-amber-500" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* EMP ID */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      EMP ID (User Name) *
                    </label>
                    <input
                      key="add-empId"
                      type="text"
                      name="empId"
                      value={formData.empId || ''}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 transition-colors ${validationErrors.empId
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                        }`}
                      placeholder="webadmin"
                      required
                    />
                    <ErrorMessage error={validationErrors.empId} />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      key="add-password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 transition-colors ${validationErrors.password
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                        }`}
                      placeholder="••••"
                      required
                    />
                    <ErrorMessage error={validationErrors.password} />
                  </div>

                  {/* Employee Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Employee Name *
                    </label>
                    <input
                      key="add-employeeName"
                      type="text"
                      name="employeeName"
                      value={formData.employeeName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 transition-colors ${validationErrors.employeeName
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                        }`}
                      placeholder="Enter full name"
                      required
                    />
                    <ErrorMessage error={validationErrors.employeeName} />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Department *
                    </label>
                    <select
                      key="add-department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 transition-colors ${validationErrors.department
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                        }`}
                      required
                    >
                      <option value="">Choose Department...</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    <ErrorMessage error={validationErrors.department} />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Gender *
                    </label>
                    <div className="flex space-x-6 mt-3">
                      <label className="flex items-center cursor-pointer">
                        <input
                          key="add-gender-male"
                          type="radio"
                          name="gender"
                          value="Male"
                          checked={formData.gender === 'Male'}
                          onChange={handleInputChange}
                          className="mr-3 w-4 h-4 text-amber-600"
                        />
                        <span className="text-gray-700">Male</span>
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          key="add-gender-female"
                          type="radio"
                          name="gender"
                          value="Female"
                          checked={formData.gender === 'Female'}
                          onChange={handleInputChange}
                          className="mr-3 w-4 h-4 text-amber-600"
                        />
                        <span className="text-gray-700">Female</span>
                      </label>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone *
                    </label>
                    <input
                      key="add-phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 transition-colors ${validationErrors.phone
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                        }`}
                      placeholder="Enter phone number"
                      required
                    />
                    <ErrorMessage error={validationErrors.phone} />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      key="add-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 transition-colors ${validationErrors.email
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                        }`}
                      placeholder="Enter email address"
                      required
                    />
                    <ErrorMessage error={validationErrors.email} />
                  </div>

                  {/* Date of Joining */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date of Joining *
                    </label>
                    <input
                      key="add-dateOfJoining"
                      type="date"
                      name="dateOfJoining"
                      value={formData.dateOfJoining}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 transition-colors ${validationErrors.dateOfJoining
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                        }`}
                      required
                    />
                    <ErrorMessage error={validationErrors.dateOfJoining} />
                  </div>

                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Address *
                    </label>
                    <textarea
                      key="add-address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows="3"
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 transition-colors ${validationErrors.address
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                        }`}
                      placeholder="Enter full address"
                      required
                    />
                    <ErrorMessage error={validationErrors.address} />
                  </div>
                </div>
              </div>

              {/* Salary Information Section */}
              <div className="border-l-4 border-orange-500 pl-6 bg-white rounded-lg shadow-sm p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                  <FaRupeeSign className="mr-2 text-orange-500" />
                  Salary Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Salary */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Basic Salary (Scale)
                    </label>
                    <div className="relative">
                      <input
                        key="add-basicSalary"
                        type="number"
                        name="basicSalary"
                        value={formData.basicSalary}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 pr-32 border-2 rounded-lg focus:ring-2 transition-colors ${validationErrors.basicSalary
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                          }`}
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-3 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Rs/- per month
                      </span>
                    </div>
                    <ErrorMessage error={validationErrors.basicSalary} />
                  </div>

                  {/* T.A */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      T.A
                    </label>
                    <div className="relative">
                      <input
                        key="add-ta"
                        type="number"
                        name="ta"
                        value={formData.ta}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 pr-32 border-2 rounded-lg focus:ring-2 transition-colors ${validationErrors.ta
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                          }`}
                        placeholder="10"
                      />
                      <span className="absolute right-3 top-3 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        % of Basic Salary
                      </span>
                    </div>
                    <ErrorMessage error={validationErrors.ta} />
                  </div>

                  {/* D.A */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      D.A
                    </label>
                    <div className="relative">
                      <input
                        key="add-da"
                        type="number"
                        name="da"
                        value={formData.da}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 pr-32 border-2 rounded-lg focus:ring-2 transition-colors ${validationErrors.da
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                          }`}
                        placeholder="15"
                      />
                      <span className="absolute right-3 top-3 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        % of Basic Salary
                      </span>
                    </div>
                    <ErrorMessage error={validationErrors.da} />
                  </div>

                  {/* H.R.A */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      H.R.A
                    </label>
                    <div className="relative">
                      <input
                        key="add-hra"
                        type="number"
                        name="hra"
                        value={formData.hra}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 pr-32 border-2 rounded-lg focus:ring-2 transition-colors ${validationErrors.hra
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                          }`}
                        placeholder="20"
                      />
                      <span className="absolute right-3 top-3 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        % of Basic Salary
                      </span>
                    </div>
                    <ErrorMessage error={validationErrors.hra} />
                  </div>

                  {/* Casual Leave */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Casual Leave
                    </label>
                    <div className="relative max-w-md">
                      <input
                        key="add-casualLeave"
                        type="number"
                        step="0.5"
                        name="casualLeave"
                        value={formData.casualLeave}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 pr-24 border-2 rounded-lg focus:ring-2 transition-colors ${validationErrors.casualLeave
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-200 focus:ring-amber-500 focus:border-amber-500'
                          }`}
                        placeholder="2.5"
                      />
                      <span className="absolute right-3 top-3 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Per Month
                      </span>
                    </div>
                    <ErrorMessage error={validationErrors.casualLeave} />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-4 pt-6">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="flex-1 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-lg"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:from-orange-700 hover:to-orange-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Adding Staff...
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
              </div>
            </form>
          </div>
        </Modal>

        {/* Edit Staff Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          title="Edit Staff"
        >
          <div className="bg-white rounded-xl shadow-lg p-6">
            <form onSubmit={handleEditStaffSubmit} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* EMP ID */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    EMP ID (User Name) *
                  </label>
                  <input
                    type="text"
                    name="empId"
                    value={formData.empId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="Enter employee ID"
                    required
                  />
                </div>

                {/* Employee Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    name="employeeName"
                    value={formData.employeeName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="Enter employee name"
                    required
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Department *
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  >
                    <option value="">Choose Department...</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                {/* Basic Salary */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Basic Salary (Scale)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="basicSalary"
                      value={formData.basicSalary}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 pr-32 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Enter basic salary"
                    />
                    <span className="absolute right-3 top-3 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Rs/- per month
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-4 pt-6">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update Staff'
                  )}
                </button>
              </div>
            </form>
          </div>
        </Modal>

        {/* View Staff Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={closeViewModal}
          title="View Staff Details"
        >
          {selectedStaff && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="space-y-8">
                {/* Personal Information Section */}
                <div className="border-l-4 border-amber-500 pl-6 bg-gradient-to-r from-amber-50 to-white rounded-lg shadow-sm p-6">
                  <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <FaUser className="mr-3 text-amber-500 text-2xl" />
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee ID</label>
                      <p className="text-lg font-bold text-gray-900 mt-1">{selectedStaff.empId}</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee Name</label>
                      <p className="text-lg font-bold text-gray-900 mt-1">{selectedStaff.employeeName}</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                        <FaPhone className="mr-2 text-amber-500" /> Phone
                      </label>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{selectedStaff.phone}</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                        <FaEnvelope className="mr-2 text-amber-500" /> Email
                      </label>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{selectedStaff.email || 'N/A'}</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Gender</label>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{selectedStaff.gender || 'N/A'}</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                        <FaCalendarAlt className="mr-2 text-amber-500" /> Date of Joining
                      </label>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{selectedStaff.dateOfJoining || 'N/A'}</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm md:col-span-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                        <FaMapMarkerAlt className="mr-2 text-amber-500" /> Address
                      </label>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{selectedStaff.address || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Department & Salary Information */}
                <div className="border-l-4 border-purple-500 pl-6 bg-gradient-to-r from-purple-50 to-white rounded-lg shadow-sm p-6">
                  <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <FaRupeeSign className="mr-3 text-purple-500 text-2xl" />
                    Department & Salary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</label>
                      <p className="text-lg font-bold text-purple-600 mt-1">{selectedStaff.department}</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</label>
                      <span className={`inline-block mt-1 px-4 py-1 rounded-full text-sm font-bold ${selectedStaff.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {selectedStaff.status}
                      </span>
                    </div>

                    <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-4 rounded-lg shadow-sm border-2 border-orange-200">
                      <label className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Basic Salary</label>
                      <p className="text-2xl font-bold text-orange-600 mt-1">₹{selectedStaff.basicSalary} /-</p>
                      <span className="text-xs text-gray-600">per month</span>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">T.A</label>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{selectedStaff.ta || '0'}%</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">D.A</label>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{selectedStaff.da || '0'}%</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">H.R.A</label>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{selectedStaff.hra || '0'}%</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm md:col-span-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Casual Leave</label>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{selectedStaff.casualLeave || '0'} days per month</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end mt-8">
                <button
                  onClick={closeViewModal}
                  className="px-8 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </BranchLayout>
  );
};

export default ManageStaff;