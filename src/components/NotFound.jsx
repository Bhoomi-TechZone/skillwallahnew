import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const NotFound = () => {
  const location = useLocation();
  
  // If this is a student route but user isn't authenticated, redirect to login
  if (location.pathname.startsWith('/students')) {
    return <Navigate to="/student/login" replace />;
  }
  
  // If this is an admin route, redirect to admin login
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/superadmin')) {
    return <Navigate to="/admin-login" replace />;
  }
  
  // If this is a branch route, redirect to branch login
  if (location.pathname.startsWith('/branch')) {
    return <Navigate to="/branch-login" replace />;
  }
  
  // For any other route, redirect to home
  return <Navigate to="/" replace />;
};

export default NotFound;