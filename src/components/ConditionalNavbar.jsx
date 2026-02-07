import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";

const ConditionalNavbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  
  // Routes where navbar should never show (even for non-authenticated users)
  const hideNavbarPaths = ['/auth', '/login', '/register', '/role-login'];
  
  // Routes where navbar should be hidden for logged-in users (dashboard areas)
  const loggedInHiddenPaths = [
    '/students', '/instructor', '/admin', '/dashboard', '/superadmin', '/branch', '/Branch',
    '/students-improved', '/instructor', '/admin-improved',
    '/profile', '/settings', '/my-courses', '/assignment-list', 
    '/create-assignment', '/schedule', '/certificate', '/my-certificate',
    '/course-content', '/student/test', '/student/test-result'
  ];
  
  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      setIsLoggedIn(!!(token && userData));
      setIsLoading(false);
    };

    // Initial check
    checkAuth();

    // Listen for storage changes (login/logout in other tabs)
    const handleStorageChange = () => {
      checkAuth();
    };

    // Listen for custom auth state changes
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChanged', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, []);

  // Also listen for location changes to re-check auth status
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    setIsLoggedIn(!!(token && userData));
  }, [location.pathname]);

  // Show loading or nothing while checking authentication
  if (isLoading) {
    return null;
  }

  // Hide navbar if user is logged in, on specific auth paths, or on dashboard paths
  const shouldHideNavbar = hideNavbarPaths.includes(location.pathname) ||
                          (isLoggedIn && loggedInHiddenPaths.some(path => location.pathname.startsWith(path)));

  if (shouldHideNavbar) {
    return null;
  }

  return <Navbar />;
};

export default ConditionalNavbar;
