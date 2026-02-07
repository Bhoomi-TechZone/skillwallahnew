import React from 'react';
import { useNavigate } from 'react-router-dom';

const TestCreateCourse = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-yellow-50/50 to-orange-50/50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-4">
            ✅ Course Create Route Working!
          </h1>
          
          <div className="bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded mb-6">
            <p className="font-semibold">Route successfully matched: /superadmin/courses/create</p>
          </div>
          
          <p className="text-gray-700 mb-6">
            This is a test component to verify the routing is working correctly. 
            The route <code className="bg-gray-100 px-2 py-1 rounded">/superadmin/courses/create</code> is now properly configured.
          </p>
          
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-amber-800">Next Steps:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Route configuration is working</li>
              <li>RoleBasedRoute is functioning</li>
              <li>Component is loading successfully</li>
              <li>Ready to integrate actual CreateCourse component</li>
            </ul>
          </div>
          
          <div className="mt-8 flex space-x-4">
            <button 
              onClick={() => navigate('/superadmin/courses/all')}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              ← Back to All Courses
            </button>
            
            <button 
              onClick={() => navigate('/superadmin/dashboard')}
              className="bg-amber-500 text-white px-6 py-3 rounded-lg hover:bg-amber-600 transition-colors"
            >
              Back to Dashboard
            </button>
            
            <button 
              onClick={() => window.location.reload()}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
            >
              🔄 Test Page Refresh
            </button>
          </div>
          
          <div className="mt-8 bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Route Debug Info:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Current Path:</strong> {window.location.pathname}</p>
              <p><strong>Current URL:</strong> {window.location.href}</p>
              <p><strong>Route Status:</strong> ✅ Successfully Matched</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestCreateCourse;