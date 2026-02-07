import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { navigateToRoleDashboard, isAuthenticated, getUserRole } from '../utils/authUtils';
import DashboardSelector from './DashboardSelector';

const DashboardRedirect = () => {
  const navigate = useNavigate();
  const [showSelector, setShowSelector] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      // If not authenticated, redirect to auth page
      navigate('/auth');
    } else {
      const role = getUserRole();
      setUserRole(role);
      
      // Check if user has a dashboard preference
      const dashboardPreference = localStorage.getItem('dashboardPreference');
      
      if (dashboardPreference) {
        // If user has a preference, navigate directly
        navigateToRoleDashboard(navigate, role);
      } else {
        // Show dashboard selector for first-time users
        setShowSelector(true);
      }
    }
  }, [navigate]);

  if (showSelector && userRole) {
    return <DashboardSelector userRole={userRole} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
};

export default DashboardRedirect;
