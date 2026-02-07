import { useState } from 'react';
import { getUserData } from '../../utils/authUtils';

/**
 * Reusable Multi-Tenant Context Display Component
 * Shows user role, branch admin status, franchise code, branch code, and backend filter logic
 */
const MultiTenantContext = ({ 
  showFilterLogic = true, 
  className = '',
  filterType = 'questions' 
}) => {
  const [showContextInfo, setShowContextInfo] = useState(false);

  // Get user context
  const userData = getUserData();
  const userContext = {
    role: userData?.role || 'N/A',
    is_branch_admin: userData?.is_branch_admin || false,
    franchise_code: userData?.franchise_code || localStorage.getItem('franchise_code') || 'N/A',
    branch_code: userData?.branch_code || localStorage.getItem('branch_code') || 'N/A',
  };

  return (
    <div className={className}>
      {/* Toggle Button */}
      <button
        onClick={() => setShowContextInfo(!showContextInfo)}
        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all flex items-center space-x-2 shadow-md"
        title="View User Context"
      >
        <span className="text-sm font-semibold">🔐 Context</span>
      </button>

      {/* Context Information Card */}
      {showContextInfo && (
        <div className="absolute right-0 top-12 z-50 w-[600px] bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 shadow-xl rounded-lg">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <span className="mr-2">🔐</span>
                Multi-Tenant Context
              </h3>
              <button
                onClick={() => setShowContextInfo(false)}
                className="text-gray-500 hover:text-gray-700 font-bold text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 shadow-sm border border-indigo-200">
                <p className="text-xs text-gray-600 font-semibold mb-1">Role</p>
                <p className="text-sm font-bold text-indigo-700">{userContext.role}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border border-purple-200">
                <p className="text-xs text-gray-600 font-semibold mb-1">Branch Admin</p>
                <p className="text-sm font-bold text-purple-700">
                  {userContext.is_branch_admin ? '✅ Yes' : '❌ No'}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border border-blue-200">
                <p className="text-xs text-gray-600 font-semibold mb-1">Franchise Code</p>
                <p className="text-sm font-bold text-blue-700">{userContext.franchise_code}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border border-orange-200">
                <p className="text-xs text-gray-600 font-semibold mb-1">Branch Code</p>
                <p className="text-sm font-bold text-orange-700">{userContext.branch_code}</p>
              </div>
            </div>
            
            {showFilterLogic && (
              <div className="mt-3 bg-white rounded-lg p-3 shadow-sm border border-yellow-200">
                <p className="text-xs text-gray-600 font-semibold mb-1">
                  Backend Filter Logic ({filterType})
                </p>
                <code className="text-xs bg-gray-100 p-2 rounded block overflow-x-auto text-gray-800">
                  {`{'$or': [{'franchise_code': '${userContext.franchise_code}'}, {'branch_code': '${userContext.branch_code}'}, {'branch_code': '${userContext.branch_code}'}]}`}
                </code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiTenantContext;
