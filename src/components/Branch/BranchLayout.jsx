import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BranchSidebar from './BranchSidebar';
import authService from '../../services/authService';
import { FaBars, FaTimes, FaBell, FaUserCircle } from 'react-icons/fa';

const BranchLayout = ({ children, sidebarOpen: propSidebarOpen, setSidebarOpen: propSetSidebarOpen }) => {
  // Use props if provided, otherwise use internal state
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(false);

  // Determine which state and setter to use
  const sidebarOpen = propSidebarOpen !== undefined ? propSidebarOpen : internalSidebarOpen;
  const setSidebarOpen = propSetSidebarOpen || setInternalSidebarOpen;

  // Sidebar collapse and hover states
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0); // Branch wallet balance
  const [notifications, setNotifications] = useState(3);
  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const navigate = useNavigate();

  // Toggle sidebar for mobile and collapse functionality
  const toggleSidebar = () => {
    if (window.innerWidth >= 1024) {
      // On desktop, toggle collapse state
      setIsCollapsed(!isCollapsed);
      console.log('Desktop: Toggling collapse state to:', !isCollapsed);
    } else {
      // On mobile, toggle sidebar visibility
      setSidebarOpen(!sidebarOpen);
      console.log('Mobile: Toggling sidebar visibility to:', !sidebarOpen);
    }
  };

  // Close sidebar when clicking outside (mobile)
  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Handle sidebar hover events for collapsed state
  const handleSidebarMouseEnter = () => {
    if (isCollapsed && window.innerWidth >= 768) {
      setIsHovering(true);
    }
  };

  const handleSidebarMouseLeave = () => {
    if (isCollapsed && window.innerWidth >= 768) {
      setIsHovering(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    // Use the comprehensive logout function from authUtils
    authService.logout();
  };

  // Fetch wallet balance and user profile
  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        // This would be replaced with actual API call
        console.log('Fetching branch wallet balance...');
        // For now, use static data
        setWalletBalance(0);
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
      }
    };

    const loadUserProfile = () => {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        if (currentUser.role) {
          setUserRole(currentUser.role);
          console.log('BranchLayout - User role set:', currentUser.role);
        }
        if (currentUser.name || currentUser.username || currentUser.email) {
          const displayName = currentUser.name || currentUser.username || currentUser.email || 'User';
          setUserName(displayName);
          console.log('BranchLayout - User name set:', displayName);
        }
        if (currentUser.email) {
          setUserEmail(currentUser.email);
        }
      } else {
        console.warn('BranchLayout - No user found, user might not be authenticated');
      }
    };

    // Handle window resize for responsive sidebar behavior
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // On desktop, close mobile sidebar if it's open
        setSidebarOpen(false);
      } else {
        // On mobile, reset collapse state
        setIsCollapsed(false);
      }
    };

    // fetchWalletBalance(); // Removed redundant call - Dashboard handles this now
    loadUserProfile();

    // Add resize event listener
    window.addEventListener('resize', handleResize);

    // Initial check
    handleResize();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Desktop */}
      <div
        className={`hidden lg:block lg:flex-shrink-0 transition-all duration-300 ease-in-out ${isCollapsed && !isHovering ? 'lg:w-16' : 'lg:w-64'
          }`}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        <div className="h-full">
          <BranchSidebar isCollapsed={isCollapsed} isHovering={isHovering} />
        </div>
      </div>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <div className="lg:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeSidebar}
          ></div>

          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-300 ease-in-out flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-800">Branch Panel</h2>
              <button
                onClick={closeSidebar}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close sidebar"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <BranchSidebar onItemClick={closeSidebar} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg">
          <div className="flex items-center justify-between px-4 py-4.5">
            {/* Left section - Mobile menu and title */}
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={toggleSidebar}
                className="lg:hidden text-white hover:bg-amber-700 p-2 rounded-lg transition-colors"
              >
                <FaBars className="text-xl" />
              </button>

              {/* Hamburger menu for desktop (matching the reference design) */}
              <button
                onClick={toggleSidebar}
                className="hidden lg:block text-white hover:bg-amber-700 p-2 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* Center section - Branch Wallet */}
            {/* <div className="flex items-center bg-orange-600 px-4 py-2 rounded-lg">
              <span className="text-sm font-medium mr-2">Branch Wallet</span>
              <span className="text-lg font-bold">₹{walletBalance}</span>
            </div> */}

            {/* Right section - Notifications and User */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              {/* <div className="relative">
                <button className="text-white hover:bg-blue-700 p-2 rounded-lg transition-colors relative">
                  <FaBell className="text-xl" />
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {notifications}
                    </span>
                  )}
                </button>
              </div> */}

              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium">{userName}</div>
                  <div className="text-xs text-amber-100">
                    {userRole ? userRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'User'}
                  </div>
                </div>

                <div className="relative group">
                  <button className="flex items-center space-x-1 text-white hover:bg-amber-700 p-2 rounded-lg transition-colors">
                    <FaUserCircle className="text-2xl" />
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <button
                      onClick={() => setShowProfileModal(true)}
                      className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 transition font-medium w-full text-left"
                    >
                      <FaUserCircle className="mr-3 text-gray-400" />
                      <span>View Profile</span>
                    </button>

                    <hr className="my-2" />

                    <button
                      onClick={handleLogout}
                      className="flex items-center px-4 py-3 text-red-600 hover:bg-red-50 transition font-medium w-full text-left"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Profile Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                      <FaUserCircle className="text-4xl" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Profile Information</h2>
                      <p className="text-amber-100 text-sm">View your account details</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <FaUserCircle className="text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="font-semibold text-gray-900">{userName}</p>
                    </div>
                  </div>

                  {userEmail && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Email Address</p>
                        <p className="font-semibold text-gray-900">{userEmail}</p>
                      </div>
                    </div>
                  )}

                  {userRole && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Role</p>
                        <p className="font-semibold text-gray-900">
                          {userRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Last Login</p>
                      <p className="font-semibold text-gray-900">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>


      </div>
    </div>
  );
};

export default BranchLayout;