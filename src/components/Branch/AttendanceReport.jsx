import { useState } from 'react';
import BranchLayout from './BranchLayout';

const AttendanceReport = () => {
  const [selectedDate, setSelectedDate] = useState('2025-12-16');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState('--Select--');

  const [attendanceData] = useState([
    {
      id: 1,
      sn: 1,
      regNo: 'SVGE2025227',
      studentName: 'Ramlal Roy',
      contactNumber: '9362514523',
      course: 'ADVANCE DIPLOMA IN COMPUTER APPLICATION (ADCA)',
      attendance: false
    },
    {
      id: 2,
      sn: 2,
      regNo: 'SVGE2025226',
      studentName: 'S SHALINI',
      contactNumber: '8297061001',
      course: 'Biology',
      attendance: false
    }
  ]);

  const handleSearch = () => {
    // Handle search logic here
    console.log('Searching with:', { selectedDate, selectedFilter, selectedEmployee });
  };

  const handleExport = () => {
    // Handle export logic here
    console.log('Exporting attendance data');
  };

  const handleSendSMS = () => {
    // Handle SMS sending logic here
    console.log('Sending SMS to absentees');
  };

  return (
    <BranchLayout>
      <div className="p-6">
        <div className="flex items-center mb-6">
          <span className="text-2xl mr-3">📋</span>
          <h1 className="text-2xl font-bold text-gray-800">MANAGE ATTEDENCE</h1>
        </div>

        {/* Search Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter
              </label>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">ALL</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="--Select--">--Select--</option>
                <option value="Employee 1">Employee 1</option>
                <option value="Employee 2">Employee 2</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                SEARCH
              </button>
            </div>
          </div>

          <div className="mt-4 flex space-x-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              Export
            </button>
            <button
              onClick={handleSendSMS}
              className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              SEND SMS
            </button>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-orange-700 text-white">
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">
                    SN
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">
                    ATTEDANCE
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">
                    REG. NO.
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">
                    Contact Number
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">
                    Course
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceData.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.sn}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={record.attendance}
                        onChange={() => {
                          // Handle attendance toggle
                        }}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.regNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.studentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.contactNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {record.course}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BranchLayout>
  );
};

export default AttendanceReport;