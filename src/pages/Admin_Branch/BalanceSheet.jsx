import React, { useState } from 'react';
import BranchLayout from '../../components/Branch/BranchLayout';

const BalanceSheet = () => {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: ''
  });

  const [reportData, setReportData] = useState([
    { date: '2025-12-16', cashDeposite: '', chequeBank: '', cash: '', details: '' },
    { date: '2025-12-15', cashDeposite: '', chequeBank: '', cash: '', details: '' },
    { date: '2025-12-14', cashDeposite: '', chequeBank: '', cash: '', details: '' },
    { date: '2025-12-13', cashDeposite: '', chequeBank: '', cash: '', details: '' }
  ]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    console.log('Searching with filters:', filters);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <BranchLayout>
      <div className="p-6 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-800">REPORT BOTH</h1>
              </div>
              <button
                onClick={handlePrint}
                className="px-5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded transition-colors text-sm"
              >
                Print
              </button>
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Start Date :</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">End Date :</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded transition-colors"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th rowSpan="2" className="px-4 py-3 bg-amber-500 text-white text-sm font-semibold border border-amber-600">
                    DATE
                  </th>
                  <th colSpan="2" className="px-4 py-3 bg-amber-500 text-white text-sm font-semibold border border-amber-600">
                    CASH IN (FEE)
                  </th>
                  <th colSpan="2" className="px-4 py-3 bg-amber-500 text-white text-sm font-semibold border border-amber-600">
                    CASH OUT
                  </th>
                </tr>
                <tr>
                  <th className="px-4 py-3 bg-amber-400 text-white text-sm font-semibold border border-amber-500">
                    Cash Deposite
                  </th>
                  <th className="px-4 py-3 bg-amber-400 text-white text-sm font-semibold border border-amber-500">
                    Cheque/Bank
                  </th>
                  <th className="px-4 py-3 bg-amber-400 text-white text-sm font-semibold border border-amber-500">
                    Cash
                  </th>
                  <th className="px-4 py-3 bg-amber-400 text-white text-sm font-semibold border border-amber-500">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm text-gray-700 border border-gray-200">
                      {row.date}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 border border-gray-200">
                      {row.cashDeposite}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 border border-gray-200">
                      {row.chequeBank}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 border border-gray-200">
                      {row.cash}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 border border-gray-200">
                      {row.details}
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

export default BalanceSheet;
