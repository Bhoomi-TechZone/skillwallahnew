import React, { useState, useEffect } from 'react';
import BranchLayout from '../../components/Branch/BranchLayout';
import { FaSpinner } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const FeeReport = () => {
  // API helper function
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    branch: '',
    fromDate: '',
    toDate: '',
    courseFilter: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // For branch users, they see their own branch info
      setBranches([{ id: 1, name: 'Current Branch' }]);

      // Fetch fees data
      const feeResponse = await fetch(`${API_BASE_URL}/api/branch/fees`, {
        headers: getAuthHeaders()
      });

      if (!feeResponse.ok) {
        if (feeResponse.status === 404) {
          setError("Fees endpoint not found - will be implemented soon");
        } else {
          setError("Failed to fetch fees data");
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setBranches([{ id: 1, name: 'Current Branch' }]);
      setError("Fees endpoint not found - will be implemented soon");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    console.log('Searching with filters:', filters);
  };

  if (loading) {
    return (
      <BranchLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FaSpinner className="text-4xl text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading fee report...</p>
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
              <h1 className="text-2xl font-bold text-gray-800">FEE REPORT</h1>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-700">{error}</p>
          </div>
        )}
      </div>
    </BranchLayout>
  );
};

export default FeeReport;
