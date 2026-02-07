import React, { useState, useEffect } from 'react';
import BranchLayout from '../../components/Branch/BranchLayout';
import { FaSpinner, FaCheckSquare, FaSquare } from 'react-icons/fa';
import { MdDelete } from 'react-icons/md';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const StudentReport = () => {
  // API helper function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState([]);

  const [filters, setFilters] = useState({
    branch: '',
    fromDate: '',
    toDate: '',
    courseFilter: '',
    selectFilter: '--Select--'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // For branch users, they see their own branch info
      setBranches([{ id: 1, name: 'Current Branch' }]);

      // Set default courses for now (can be made dynamic later)
      setCourses([
        { id: 1, name: 'ADVANCE DIPLOMA IN COMPUTER APPLICATION (ADCA)' },
        { id: 2, name: 'Sewing Machine Training Awareness Program' }
      ]);

      // Demo data
      setStudents([
        {
          id: 1,
          formNo: 'SVGE2025229',
          name: 'AA ANIL',
          contact: '1010101010',
          course: 'ADVANCE DIPLOMA IN COMPUTER APPLICATION (ADCA)',
          due: 9800,
          lastPay: '--'
        },
        {
          id: 2,
          formNo: 'SVGE2025225',
          name: 'ISHAN BANERJEE',
          contact: '7811985435',
          course: 'ADVANCE DIPLOMA IN COMPUTER APPLICATION (ADCA)',
          due: 9800,
          lastPay: '--'
        },
        {
          id: 3,
          formNo: 'SVGE2025223',
          name: 'Devansh',
          contact: '7217534331',
          course: 'Sewing Machine Training Awareness Program',
          due: 100,
          lastPay: '--'
        }
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      setBranches([{ id: 1, name: 'Main Branch' }]);
      setCourses([
        { id: 1, name: 'ADVANCE DIPLOMA IN COMPUTER APPLICATION (ADCA)' },
        { id: 2, name: 'Sewing Machine Training Awareness Program' }
      ]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    console.log('Searching with filters:', filters);
    fetchData();
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleExport = () => {
    console.log('Exporting data...');
  };

  const handleSendSMS = () => {
    console.log('Sending SMS to selected students:', selectedStudents);
  };

  if (loading) {
    return (
      <BranchLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FaSpinner className="text-4xl text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading student report...</p>
          </div>
        </div>
      </BranchLayout>
    );
  }

  return (
    <BranchLayout>
      <div className="p-6 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">MANAGE STUDENT</h1>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {/* Branch Dropdown */}
              <div>
                <select
                  value={filters.branch}
                  onChange={(e) => handleFilterChange('branch', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">-- BRANCH --</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.name}>{branch.name}</option>
                  ))}
                </select>
              </div>

              {/* From Date */}
              <div>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="mm/dd/yyyy"
                />
              </div>

              {/* To Date */}
              <div>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="mm/dd/yyyy"
                />
              </div>

              {/* Course Filter */}
              <div>
                <select
                  value={filters.courseFilter}
                  onChange={(e) => handleFilterChange('courseFilter', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">ALL</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.name}>{course.name}</option>
                  ))}
                </select>
              </div>

              {/* Select Filter */}
              <div>
                <select
                  value={filters.selectFilter}
                  onChange={(e) => handleFilterChange('selectFilter', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="--Select--">--Select--</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Search Button */}
              <div>
                <button
                  onClick={handleSearch}
                  className="w-full px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors font-medium"
                >
                  SEARCH
                </button>
              </div>
            </div>

            {/* Export and Send SMS Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleExport}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded transition-colors text-sm font-medium"
              >
                Export
              </button>
              <button
                onClick={handleSendSMS}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors text-sm font-medium"
              >
                SEND SMS
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-orange-700 text-white">
                  <th className="px-4 py-3 text-left text-sm font-semibold">SN</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Form No.</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Contact Number</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Course</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Due</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Last Pay</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Admit Card</th>
                </tr>
              </thead>
              <tbody>
                {students.length > 0 ? (
                  students.map((student, index) => (
                    <tr key={student.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{student.formNo}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.contact}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{student.course}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.due}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{student.lastPay}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleStudentSelection(student.id)}
                            className="text-amber-600 hover:text-amber-800 transition-colors"
                          >
                            {selectedStudents.includes(student.id) ? (
                              <FaCheckSquare className="text-xl" />
                            ) : (
                              <FaSquare className="text-xl" />
                            )}
                          </button>
                          <button className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded transition-colors">
                            <MdDelete className="text-lg" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                      No students found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BranchLayout>
  );
};

export default StudentReport;
