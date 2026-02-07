import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getDashboardRoute } from '../utils/authUtils';

const RoleBasedRoute = ({ children, allowedRoles, redirectTo = null }) => {
  const [authState, setAuthState] = useState({
    isChecking: true,
    authenticated: false,
    userRole: null
  });

  useEffect(() => {
    // ULTRA FAST auth check - no delays, immediate processing
    const checkAuth = () => {
      try {
        console.log('🚀 ULTRA FAST AUTH CHECK - NO DELAYS');
        
        // Get auth data immediately from multiple sources + session persistence
        const token = localStorage.getItem('token') || 
                     localStorage.getItem('authToken') || 
                     localStorage.getItem('adminToken') ||
                     sessionStorage.getItem('token');
        const userDataStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        const userRoleBackup = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
        const isAuthenticated = localStorage.getItem('isAuthenticated') || sessionStorage.getItem('isAuthenticated');
        const sessionPersistent = localStorage.getItem('sessionPersistent');
        
        console.log('📊 COMPREHENSIVE TOKEN PERSISTENCE CHECK:');
        console.log('- Current URL:', window.location.href);
        console.log('- Allowed Roles:', allowedRoles);
        console.log('- localStorage token:', !!localStorage.getItem('token'));
        console.log('- localStorage authToken:', !!localStorage.getItem('authToken'));
        console.log('- localStorage adminToken:', !!localStorage.getItem('adminToken'));
        console.log('- sessionStorage token:', !!sessionStorage.getItem('token'));
        console.log('- Final token found:', !!token);
        console.log('- User data exists:', !!userDataStr);
        console.log('- UserRole backup:', userRoleBackup);
        console.log('- IsAuthenticated flag:', isAuthenticated);
        console.log('- Session persistent flag:', sessionPersistent);
        
        // Enhanced token restoration and persistence check
        if (!localStorage.getItem('token') && sessionStorage.getItem('token')) {
          console.log('🔄 RESTORING TOKEN FROM SESSION STORAGE');
          localStorage.setItem('token', sessionStorage.getItem('token'));
          localStorage.setItem('user', sessionStorage.getItem('user') || '{}');
          localStorage.setItem('userRole', sessionStorage.getItem('userRole') || 'super_admin');
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('sessionPersistent', 'true');
          console.log('✅ TOKEN RESTORED FROM SESSION BACKUP');
        }
        
        // If we still have no token but authentication flags exist, it means tokens were cleared
        if (!token && (isAuthenticated === 'true' || userRoleBackup === 'super_admin')) {
          console.log('⚠️ WARNING: Authentication flags exist but token missing - potential localStorage clearing issue');
        }
        
        let userData = null;
        try {
          userData = userDataStr ? JSON.parse(userDataStr) : null;
        } catch (parseError) {
          console.error('❌ Failed to parse user data, using backup role');
        }
        
        // AGGRESSIVE AUTH: If we have ANY auth data, consider authenticated
        const hasToken = !!token;
        const hasRole = !!(userData?.role || userRoleBackup);
        const hasAuthFlag = isAuthenticated === 'true';
        const finalUserRole = userData?.role || userRoleBackup || 'super_admin';
        
        console.log('🎯 COMPREHENSIVE AUTH RESULTS:');
        console.log('- Has Token:', hasToken);
        console.log('- Has Role:', hasRole);
        console.log('- Has Auth Flag:', hasAuthFlag);
        console.log('- Final Role:', finalUserRole);
        console.log('- Token source:', token ? 'Found' : 'Missing');
        
        // If we have auth data OR auth flag, grant access IMMEDIATELY
        if ((hasToken && hasRole) || hasAuthFlag) {
          console.log('✅ IMMEDIATE ACCESS GRANTED - PERSISTENT SESSION ACTIVE');
          
          // Check if this is a super admin route
          if (allowedRoles && (allowedRoles.includes('super_admin') || allowedRoles.includes('superadmin'))) {
            // For super admin routes, be flexible with role names
            if (finalUserRole === 'super_admin' || finalUserRole === 'superadmin' || finalUserRole === 'SUPER_ADMIN' || hasAuthFlag) {
              console.log('🌟 SUPER ADMIN ACCESS GRANTED IMMEDIATELY');
              setAuthState({
                isChecking: false,
                authenticated: true,
                userRole: finalUserRole
              });
              return;
            } else {
              console.log('❌ NOT SUPER ADMIN - Redirecting');
              setAuthState({
                isChecking: false,
                authenticated: false,
                userRole: finalUserRole,
                forceRedirect: '/super-admin-login'
              });
              return;
            }
          } else {
            // For other routes, check if user role is in allowed roles
            const hasAccess = allowedRoles ? allowedRoles.includes(finalUserRole) : true;
            
            if (hasAccess || hasAuthFlag) {
              console.log('✅ ROLE ACCESS GRANTED IMMEDIATELY');
              setAuthState({
                isChecking: false,
                authenticated: true,
                userRole: finalUserRole
              });
              return;
            } else {
              console.log('❌ INSUFFICIENT ROLE PRIVILEGES');
              setAuthState({
                isChecking: false,
                authenticated: false,
                userRole: finalUserRole
              });
              return;
            }
          }
        }
        
        // If no auth data, redirect immediately
        console.log('❌ NO AUTH DATA - IMMEDIATE REDIRECT');
        
        // Check if super admin route for redirect
        if (allowedRoles && (allowedRoles.includes('super_admin') || allowedRoles.includes('superadmin'))) {
          setAuthState({
            isChecking: false,
            authenticated: false,
            userRole: null,
            forceRedirect: '/super-admin-login'
          });
          return;
        }
        
        setAuthState({
          isChecking: false,
          authenticated: false,
          userRole: null
        });
        
      } catch (error) {
        console.error('❌ AUTH CHECK ERROR:', error);
        
        // On error, redirect to appropriate login
        if (allowedRoles && (allowedRoles.includes('super_admin') || allowedRoles.includes('superadmin'))) {
          setAuthState({
            isChecking: false,
            authenticated: false,
            userRole: null,
            forceRedirect: '/super-admin-login'
          });
        } else {
          setAuthState({
            isChecking: false,
            authenticated: false,
            userRole: null
          });
        }
      }
    };

    // Execute auth check IMMEDIATELY - NO DELAYS
    checkAuth();
  }, [allowedRoles]);

  // Show minimal loading while checking authentication - VERY BRIEF
  if (authState.isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-gray-600 font-medium text-xs">Loading...</p>
        </div>
      </div>
    );
  }

  // FORCE REDIRECT for super admin routes
  if (authState.forceRedirect) {
    console.log('🚨 FORCE REDIRECTING TO:', authState.forceRedirect);
    return <Navigate to={authState.forceRedirect} replace />;
  }

  // If not authenticated, redirect to appropriate auth page
  if (!authState.authenticated) {
    console.log('🔐 Not authenticated - redirecting');
    console.log('🔍 Current URL:', window.location.href);
    
    // If this route requires super admin access, redirect to super admin login
    const requiresSuperAdmin = allowedRoles && (
      allowedRoles.includes('super_admin') || 
      allowedRoles.includes('superadmin')
    );
    
    if (requiresSuperAdmin) {
      console.log('🔑 Super admin route - redirecting to /super-admin-login');
      return <Navigate to="/super-admin-login" replace />;
    }
    
    // Default to general auth page
    console.log('🔑 General route - redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  // If no specific roles required, just check authentication
  if (!allowedRoles || allowedRoles.length === 0) {
    console.log('✅ No role restrictions, allowing access');
    return children;
  }

  // Check if user role is in allowed roles (handle super_admin variations)
  const userRole = authState.userRole;
  
  // Direct role matching - CRITICAL for preventing wrong redirects
  console.log('🔍 FINAL ROLE VALIDATION:');
  console.log('   User role:', userRole);
  console.log('   Allowed roles:', allowedRoles);
  
  // Check if user's role matches any allowed role
  const hasRequiredRole = allowedRoles.includes(userRole) ||
                         (userRole === 'super_admin' && allowedRoles.includes('superadmin')) ||
                         (userRole === 'superadmin' && allowedRoles.includes('super_admin'));
  
  console.log('   Has required role:', hasRequiredRole);
  
  if (!hasRequiredRole) {
    // User doesn't have required role - redirect to their correct dashboard
    const redirectRoute = redirectTo || getDashboardRoute(userRole);
    console.log('🚫 ROLE NOT ALLOWED - Redirecting to:', redirectRoute);
    return <Navigate to={redirectRoute} replace />;
  }

  console.log('✅ ROLE AUTHORIZED - Rendering component IMMEDIATELY');
  
  // User has required role, render the component
  return children;
};

export default RoleBasedRoute;