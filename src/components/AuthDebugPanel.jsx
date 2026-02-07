import React, { useState, useEffect } from 'react';
import { apiRequest, debugAuth, getAuthToken, isTokenExpired, clearAuth } from '../utils/apiRequest';

/**
 * Temporary Authentication Debug Component
 * Add this to your dashboard to help troubleshoot auth issues
 */
const AuthDebugPanel = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState({});
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const token = getAuthToken();
    const isExpired = token ? isTokenExpired(token) : true;
    
    let userInfo = null;
    try {
      const userKeys = ['user', 'userInfo', 'currentUser', 'authUser', 'userData'];
      for (const key of userKeys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          userInfo = JSON.parse(stored);
          break;
        }
      }
    } catch (e) {
      console.warn('Could not parse user info:', e);
    }

    setAuthStatus({
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'None',
      isExpired,
      userInfo,
      localStorageKeys: Object.keys(localStorage),
    });
  };

  const runAuthTests = async () => {
    setIsLoading(true);
    const results = [];

    // Test 1: Token validation
    results.push({
      test: 'Token Validation',
      status: authStatus.hasToken && !authStatus.isExpired ? 'pass' : 'fail',
      message: authStatus.hasToken 
        ? (authStatus.isExpired ? 'Token expired' : 'Token valid')
        : 'No token found'
    });

    // Test 2: Profile endpoint
    try {
      const profileResponse = await apiRequest('/auth/profile');
      results.push({
        test: 'Profile API',
        status: 'pass',
        message: `Successfully fetched profile for ${profileResponse.data.user?.name || 'Unknown'}`
      });
    } catch (error) {
      results.push({
        test: 'Profile API',
        status: 'fail',
        message: error.message
      });
    }

    // Test 3: Other endpoints
    const endpoints = ['/course/', '/users/instructors'];
    for (const endpoint of endpoints) {
      try {
        const response = await apiRequest(endpoint);
        results.push({
          test: `Endpoint ${endpoint}`,
          status: 'pass',
          message: `Success - received ${Array.isArray(response.data) ? response.data.length : 'data'} items`
        });
      } catch (error) {
        results.push({
          test: `Endpoint ${endpoint}`,
          status: 'fail',
          message: error.message
        });
      }
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const handleClearAuth = () => {
    if (confirm('This will clear all authentication data and reload the page. Continue?')) {
      clearAuth();
      window.location.reload();
    }
  };

  const handleDebugLog = () => {
    debugAuth();
    alert('Check browser console for detailed debug information');
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        >
          🔧 Auth Debug
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">🔧 Authentication Debug Panel</h2>
          <button 
            onClick={() => {
              setIsOpen(false);
              if (onClose) onClose();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Authentication Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3">Authentication Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Token Present:</strong> 
              <span className={`ml-2 ${authStatus.hasToken ? 'text-orange-600' : 'text-red-600'}`}>
                {authStatus.hasToken ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div>
              <strong>Token Status:</strong>
              <span className={`ml-2 ${!authStatus.isExpired ? 'text-orange-600' : 'text-red-600'}`}>
                {authStatus.hasToken ? (authStatus.isExpired ? '❌ Expired' : '✅ Valid') : '❌ None'}
              </span>
            </div>
            <div>
              <strong>Token Preview:</strong>
              <span className="ml-2 font-mono text-xs">{authStatus.tokenPreview}</span>
            </div>
            <div>
              <strong>User Info:</strong>
              <span className={`ml-2 ${authStatus.userInfo ? 'text-orange-600' : 'text-red-600'}`}>
                {authStatus.userInfo ? `✅ ${authStatus.userInfo.name || authStatus.userInfo.email || 'Found'}` : '❌ None'}
              </span>
            </div>
          </div>
          
          {authStatus.userInfo && (
            <div className="mt-3 p-2 bg-white rounded border">
              <strong>User Details:</strong>
              <pre className="text-xs mt-1 overflow-x-auto">
                {JSON.stringify(authStatus.userInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-3">Test Results</h3>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className={`p-2 rounded ${
                  result.status === 'pass' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                }`}>
                  <div className="flex items-center">
                    <span className="mr-2">{result.status === 'pass' ? '✅' : '❌'}</span>
                    <strong>{result.test}:</strong>
                    <span className="ml-2">{result.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={runAuthTests}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
          >
            {isLoading ? '🔄 Testing...' : '🧪 Run Tests'}
          </button>
          
          <button
            onClick={checkAuthStatus}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            🔄 Refresh Status
          </button>
          
          <button
            onClick={handleDebugLog}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            📋 Debug to Console
          </button>
          
          <button
            onClick={handleClearAuth}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            🗑️ Clear Auth Data
          </button>
        </div>

        {/* localStorage Keys */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3">localStorage Keys</h3>
          <div className="text-sm">
            {authStatus.localStorageKeys.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {authStatus.localStorageKeys.map(key => (
                  <span key={key} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {key}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-500">No localStorage data found</span>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">🔍 Troubleshooting Guide</h3>
          <ul className="text-sm space-y-1">
            <li>• If no token is found, please login again</li>
            <li>• If token is expired, clear auth data and login again</li>
            <li>• If API tests fail with 401 errors, the server might not be recognizing the token</li>
            <li>• Check browser console for detailed error messages</li>
            <li>• Make sure you're using the correct API base URL</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuthDebugPanel;
