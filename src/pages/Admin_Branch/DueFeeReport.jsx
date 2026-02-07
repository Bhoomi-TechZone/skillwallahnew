import React, { useState, useEffect } from 'react';
import BranchLayout from '../../components/Branch/BranchLayout';
import { FaSpinner } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const DuesFeeReport = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0]
  });

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/dues-report?fromDate=${filters.fromDate}&toDate=${filters.toDate}`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching dues report:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = () => {
    console.log('Sending SMS...');
  };

  const handleExport = () => {
    console.log('Exporting data...');
  };

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

            {/* Search Section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Search By :</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                {/* From Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date :</label>
                  <input
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* To Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date :</label>
                  <input
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Search Button */}
                <div>
                  <button
                    onClick={handleSearch}
                    className="px-6 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded transition-colors"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleSendSMS}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 rounded transition-colors text-sm font-medium border border-yellow-500"
              >
                sms
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded transition-colors text-sm font-medium"
              >
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">SID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contact No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Course</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total Paid</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Due(Rs.)</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Due Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center">
                      <FaSpinner className="text-2xl text-amber-500 animate-spin mx-auto mb-2" />
                      <p className="text-gray-600">Loading...</p>
                    </td>
                  </tr>
                ) : students.length > 0 ? (
                  students.map((student, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">{student.sid}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.contact}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.course}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.totalPaid}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.due}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.dueDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.remarks}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-6 text-center text-gray-600">
                      No Records Found
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

export default DuesFeeReport;
