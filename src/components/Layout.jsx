


import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Check authentication status
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        setIsLoggedIn(!!(token && userData));
    }, []);

    // You can fetch role from user context or hardcode for testing
    const userRole = 'student'; // or 'instructor', 'admin'

    return (
        <div className="flex">
          

            <div className="flex-1 min-h-screen" style={{ backgroundColor: '#f5ead8' }}>
               {/* Navbar removed for logged-in users */}
                <main className="p-4">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
