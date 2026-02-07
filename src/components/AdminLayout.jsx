import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaBell, FaCog, FaSearch, FaUserCircle } from 'react-icons/fa';
import AdminSidebar from './AdminSidebar';

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [adminInfo, setAdminInfo] = useState({ name: 'Admin', email: 'admin@example.com' });
  const navigate = useNavigate();

  // Get user info from localStorage
  React.useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setAdminInfo({
          name: user.name || 'Admin',
          email: user.email || 'admin@example.com',
          role: user.role || 'admin'
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  // Toggle sidebar for mobile and collapse functionality
  const toggleSidebar = () => {
    if (window.innerWidth >= 1024) {
      // On desktop, toggle collapse state
      setIsCollapsed(!isCollapsed);
    } else {
      // On mobile, toggle sidebar visibility
      setSidebarOpen(!sidebarOpen);
    }
  };

  // Handle sidebar hover events for collapsed state
  const handleSidebarMouseEnter = () => {
    if (isCollapsed && window.innerWidth >= 1024) {
      setIsHovering(true);
    }
  };

  const handleSidebarMouseLeave = () => {
    if (isCollapsed && window.innerWidth >= 1024) {
      setIsHovering(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div 
        className={`fixed left-0 top-0 h-full z-30 transition-all duration-300 ease-in-out ${
          isCollapsed && !isHovering ? 'w-16' : 'w-64'
        }`}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        <AdminSidebar 
          isOpen={sidebarOpen} 
          toggleSidebar={toggleSidebar}
          isCollapsed={isCollapsed} 
          isHovering={isHovering}
        />
      </div>

      {/* Main content */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
        isCollapsed && !isHovering ? 'ml-16' : 'ml-64'
      }`}>
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Left side */}
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <FaBars className="h-5 w-5" />
              </button>

              {/* Desktop hamburger button for collapse */}
              <button
                onClick={toggleSidebar}
                className="hidden lg:block p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <FaBars className="h-5 w-5" />
              </button>

              {/* Search bar */}
              <div className="hidden md:flex items-center relative">
                <FaSearch className="absolute left-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent w-80"
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button 
                onClick={() => navigate('/admin/notifications')}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <FaBell className="h-5 w-5" />
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400"></span>
              </button>

              {/* Settings */}
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <FaCog className="h-5 w-5" />
              </button>

              {/* User menu */}
              <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{adminInfo.name}</p>
                  <p className="text-xs text-gray-500">{adminInfo.role}</p>
                </div>
                <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100">
                  <FaUserCircle className="h-8 w-8 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
  <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
