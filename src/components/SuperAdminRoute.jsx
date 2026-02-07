// Simple and bulletproof authentication component for Super Admin routes
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

const SuperAdminRoute = ({ children }) => {
  const [authState, setAuthState] = useState('checking'); // 'checking', 'authenticated', 'not_authenticated'

  useEffect(() => {
    // Very simple and direct authentication check
    const checkSuperAdminAuth = () => {
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        console.log('🔰 SUPER ADMIN ROUTE CHECK');
        console.log('Token exists:', !!token);
        console.log('User data:', userStr);
        
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            console.log('Parsed user:', user);
            console.log('User role:', user.role);
            
            if (user.role === 'super_admin' || user.role === 'superadmin') {
              console.log('✅ SUPER ADMIN AUTHENTICATED - GRANTING ACCESS');
              setAuthState('authenticated');
              return;
            }
          } catch (parseError) {
            console.error('Parse error:', parseError);
          }
        }
        
        console.log('❌ NOT SUPER ADMIN - REDIRECTING');
        setAuthState('not_authenticated');
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthState('not_authenticated');
      }
    };

    checkSuperAdminAuth();
  }, []);

  if (authState === 'checking') {
    return <div style={{padding: '20px', textAlign: 'center'}}>Checking authentication...</div>;
  }

  if (authState === 'not_authenticated') {
    console.log('🔑 Redirecting to super admin login');
    return <Navigate to="/super-admin-login" replace />;
  }

  console.log('✅ Rendering super admin component');
  return children;
};

export default SuperAdminRoute;