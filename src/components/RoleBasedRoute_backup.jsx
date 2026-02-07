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
    // VERY AGGRESSIVE auth check with multiple fallbacks
    const checkAuth = async () => {
      try {
        console.log('🚀 STARTING AGGRESSIVE AUTH CHECK');
        
        // IMMEDIATE check - no delays
        let token = localStorage.getItem('token') || 
                   localStorage.getItem('authToken') || 
                   localStorage.getItem('adminToken');
        let userDataStr = localStorage.getItem('user');
        let userRoleBackup = localStorage.getItem('userRole');
        
        console.log('📊 IMMEDIATE AUTH DATA:');
        console.log('- Current URL:', window.location.href);
        console.log('- Allowed Roles:', allowedRoles);
        console.log('- Token exists:', !!token);
        console.log('- User data exists:', !!userDataStr);
        console.log('- UserRole backup:', userRoleBackup);
        
        // If we have SOME auth data, proceed immediately
        if (token && (userDataStr || userRoleBackup)) {
          console.log('✅ IMMEDIATE AUTH SUCCESS - Processing...');
          
          let userData = null;
          try {
            userData = userDataStr ? JSON.parse(userDataStr) : null;
          } catch (parseError) {
            console.error('❌ Failed to parse user data:', parseError);
          }
          
          const finalUserRole = userData?.role || userRoleBackup || 'super_admin';
          
          console.log('🎯 IMMEDIATE RESULTS:');
          console.log('- Final Role:', finalUserRole);
          console.log('- Is Super Admin Route:', allowedRoles && (allowedRoles.includes('super_admin') || allowedRoles.includes('superadmin')));
          
          // For super admin routes, allow immediately if we have any auth data
          if (allowedRoles && (allowedRoles.includes('super_admin') || allowedRoles.includes('superadmin'))) {
            if (finalUserRole === 'super_admin' || finalUserRole === 'superadmin' || finalUserRole === 'SUPER_ADMIN') {
              console.log('🚀 IMMEDIATE SUPER ADMIN ACCESS GRANTED');
              setAuthState({
                isChecking: false,
                authenticated: true,
                userRole: finalUserRole
              });
              return;
            }
          }
          
          // For other routes, also allow immediately
          console.log('🚀 IMMEDIATE ACCESS GRANTED FOR OTHER ROUTES');
          setAuthState({
            isChecking: false,
            authenticated: true,
            userRole: finalUserRole
          });
          return;
        }
        
        // If no immediate auth data, wait a tiny bit and try again
        console.log('⏳ No immediate auth data, waiting 200ms...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Retry getting auth data
        token = localStorage.getItem('token') || 
                localStorage.getItem('authToken') || 
                localStorage.getItem('adminToken');
        userDataStr = localStorage.getItem('user');
        userRoleBackup = localStorage.getItem('userRole');
        
        console.log('🔄 RETRY AUTH DATA:');
        console.log('- Token exists after retry:', !!token);
        console.log('- User data exists after retry:', !!userDataStr);
        console.log('- UserRole backup after retry:', userRoleBackup);
        
        // If STILL no auth data after retry, redirect
        if (!token && !userRoleBackup && !userDataStr) {
          console.log('❌ NO AUTH DATA FOUND AFTER RETRY - Redirecting...');
          
          // Check if super admin route
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
          return;
        }
        
        // If we found auth data after retry, process it
        let userData = null;
        try {
          userData = userDataStr ? JSON.parse(userDataStr) : null;
        } catch (parseError) {
          console.error('❌ Failed to parse user data:', parseError);
        }
        
        const finalUserRole = userData?.role || userRoleBackup || 'super_admin';
        
        console.log('🎯 FINAL RETRY RESULTS:');
        console.log('- Final Role:', finalUserRole);
        console.log('- Auth Success:', true);
        
        // Grant access after retry
        setAuthState({
          isChecking: false,
          authenticated: true,
          userRole: finalUserRole
        });
        
        let userData = null;
        try {
          userData = userDataStr ? JSON.parse(userDataStr) : null;
          console.log('✅ Parsed user data:', userData);
          console.log('✅ User role from data:', userData?.role);
        } catch (parseError) {
          console.error('❌ Failed to parse user data:', parseError);
        }
        
        // PERSISTENT AUTH CHECK: Check for authentication without expiration
        const hasToken = !!(token);
        const hasRole = !!(userData?.role || userRoleBackup);
        const authenticated = hasToken && hasRole;
        const finalUserRole = userData?.role || userRoleBackup || null;

        console.log('🎯 FINAL AUTH RESULTS:');
        console.log('- Has Token:', hasToken);
        console.log('- Has Role:', hasRole);
        console.log('- Authenticated (PERSISTENT):', authenticated);
        console.log('- Final Role:', finalUserRole);
        
        // If not authenticated, redirect appropriately
        if (!authenticated || !finalUserRole) {
          console.log('❌ NOT AUTHENTICATED - Redirecting...');
          
          // Check if super admin route
          if (allowedRoles && (allowedRoles.includes('super_admin') || allowedRoles.includes('superadmin'))) {
            console.log('🔰 Super admin route required - redirecting to super admin login');
            setAuthState({
              isChecking: false,
              authenticated: false,
              userRole: null,
              forceRedirect: '/super-admin-login'
            });
            return;
          }
          
          // Regular auth route
          console.log('🔐 Regular route - redirecting to general auth');
          setAuthState({
            isChecking: false,
            authenticated: false,
            userRole: null
          });
          return;
        }

        // User is authenticated with a valid role - NO EXPIRATION CHECKS
        console.log('✅ PERSISTENT AUTHENTICATED USER:', finalUserRole);
        
        // If this is a super admin route
        if (allowedRoles && (allowedRoles.includes('super_admin') || allowedRoles.includes('superadmin'))) {
          console.log('🔰 SUPER ADMIN ROUTE DETECTED');
          
          // Check if user has super admin role (be flexible with role names)
          if (finalUserRole === 'super_admin' || finalUserRole === 'superadmin' || finalUserRole === 'SUPER_ADMIN') {
            console.log('✅ SUPER ADMIN ACCESS GRANTED');
            setAuthState({
              isChecking: false,
              authenticated: true,
              userRole: finalUserRole
            });
            return;
          } else {
            console.log('❌ INSUFFICIENT SUPER ADMIN PRIVILEGES');
            setAuthState({
              isChecking: false,
              authenticated: false,
              userRole: finalUserRole,
              forceRedirect: '/super-admin-login'
            });
            return;
          }
        } else {
          // This is a regular user route
          console.log('👤 REGULAR ROLE ROUTE');
          
          // Check if user role is in allowed roles
          const hasAccess = allowedRoles ? allowedRoles.includes(finalUserRole) : true;
          
          if (hasAccess) {
            console.log('✅ ROLE ACCESS GRANTED');
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
        
      } catch (error) {
        console.error('❌ AUTH CHECK ERROR:', error);
        // On error, be very cautious - redirect to appropriate login
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

    // Execute auth check
    checkAuth();
  }, [allowedRoles]);

  // Show minimal loading while checking authentication - REDUCED TIME
  if (authState.isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-gray-600 font-medium text-sm">Loading...</p>
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
  console.log('🔍 ROLE VALIDATION:');
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

  console.log('✅ ROLE AUTHORIZED - Rendering component');
  
  // User has required role, render the component
  return children;
};

export default RoleBasedRoute;