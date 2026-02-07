import { useState } from 'react';
import {
    FaAngleDown, FaAngleRight,
    FaBell,
    FaBook,
    FaCertificate,
    FaChalkboardTeacher,
    FaChartBar, FaCog,
    FaDollarSign,
    FaFileAlt,
    FaGraduationCap,
    FaHeadset,
    FaQuestionCircle,
    FaShieldAlt,
    FaSignOutAlt,
    FaTachometerAlt,
    FaUserGraduate,
    FaUsers
} from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const AdminSidebar = ({ isOpen, toggleSidebar, isCollapsed = false, isHovering = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  // Check if sidebar should show full content
  const showFullContent = !isCollapsed || isHovering;

  const menuItems = [
    {
      key: 'dashboard',
      title: 'Dashboard',
      icon: FaTachometerAlt,
      path: '/branch/dashboard',
      active: location.pathname === '/branch/dashboard'
    },
    {
      key: 'users',
      title: 'Users',
      icon: FaUsers,
      submenu: [
        { title: 'All Users', path: '/admin/users', icon: FaUsers },
        { title: 'Add User', path: '/admin/users/add', icon: FaUsers },
        { title: 'User Roles', path: '/admin/users/roles', icon: FaShieldAlt }
      ]
    },
    {
      key: 'instructors',
      title: 'Instructors',
      icon: FaChalkboardTeacher,
      path: '/admin/instructors',
      active: location.pathname.includes('/admin/instructors')
    },
    {
      key: 'students',
      title: 'Students',
      icon: FaUserGraduate,
      path: '/admin/students',
      active: location.pathname.includes('/admin/students')
    },
    {
      key: 'courses',
      title: 'Courses',
      icon: FaBook,
      submenu: [
        { title: 'All Courses', path: '/admin/courses', icon: FaBook },
        { title: 'Categories', path: '/admin/courses/categories', icon: FaGraduationCap }
      ]
    },
    {
      key: 'branches',
      title: 'Manage Branch',
      icon: FaGraduationCap,
      path: '/admin/branches',
      active: location.pathname.includes('/admin/branches')
    },
    {
      key: 'certificates',
      title: 'Certificates',
      icon: FaCertificate,
      path: '/admin/certificates',
      active: location.pathname.includes('/admin/certificates')
    },
    {
      key: 'finance',
      title: 'Finance',
      icon: FaDollarSign,
      submenu: [
        { title: 'Transactions', path: '/admin/finance/transactions', icon: FaDollarSign },
        { title: 'Payments', path: '/admin/finance/payments', icon: FaDollarSign },
        { title: 'Reports', path: '/admin/finance/reports', icon: FaChartBar }
      ]
    },
    {
      key: 'analytics',
      title: 'Analytics',
      icon: FaChartBar,
      submenu: [
        { title: 'Overview', path: '/admin/analytics', icon: FaChartBar },
        { title: 'User Analytics', path: '/admin/analytics/users', icon: FaUsers },
        { title: 'Course Analytics', path: '/admin/analytics/courses', icon: FaBook }
      ]
    },
    {
      key: 'content',
      title: 'Content Management',
      icon: FaFileAlt,
      submenu: [
        { title: 'Pages', path: '/admin/content/pages', icon: FaFileAlt },
        { title: 'Announcements', path: '/admin/content/announcements', icon: FaBell },
        { title: 'FAQ', path: '/admin/content/faq', icon: FaQuestionCircle }
      ]
    },
    {
      key: 'notifications',
      title: 'Notifications',
      icon: FaBell,
      path: '/admin/notifications',
      active: location.pathname.includes('/admin/notifications')
    },
    {
      key: 'support',
      title: 'Support',
      icon: FaHeadset,
      submenu: [
        { title: 'Tickets', path: '/admin/support/tickets', icon: FaHeadset },
        { title: 'Live Chat', path: '/admin/support/chat', icon: FaHeadset }
      ]
    },
    {
      key: 'settings',
      title: 'Settings',
      icon: FaCog,
      path: '/admin/settings',
      active: location.pathname.includes('/admin/settings')
    }
  ];

  const isActive = (item) => {
    if (item.path && location.pathname === item.path) return true;
    if (item.submenu) {
      return item.submenu.some(subItem => location.pathname === subItem.path);
    }
    return false;
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
  <div className="fixed inset-y-0 left-0 z-50 w-full h-full bg-white shadow-xl border-r border-primary-100 lg:static lg:inset-0">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 border-b border-primary-100 bg-gradient-to-r from-primary-50 to-accent-50">
          {showFullContent ? (
            <h1 className="text-xl font-bold text-primary-700">LMS Admin</h1>
          ) : (
            <h1 className="text-lg font-bold text-primary-700">LMS</h1>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-3 space-y-1">
            {menuItems.map((item) => (
              <div key={item.key}>
                {/* Main menu item */}
                {item.submenu ? (
                  <button
                    onClick={() => toggleMenu(item.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive(item) 
                        ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600' 
                        : 'text-secondary-700 hover:bg-primary-50 hover:text-primary-600'
                    }`}
                  >
                    <div className="flex items-center">
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.title}
                    </div>
                    {expandedMenus[item.key] ? (
                      <FaAngleDown className="h-4 w-4" />
                    ) : (
                      <FaAngleRight className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  <Link
                    to={item.path}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive(item)
                        ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                        : 'text-secondary-700 hover:bg-primary-50 hover:text-primary-600'
                    }`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.title}
                  </Link>
                )}

                {/* Submenu */}
                {item.submenu && expandedMenus[item.key] && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.submenu.map((subItem, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          // Close the dropdown after selecting a submenu item
                          setExpandedMenus(prev => ({
                            ...prev,
                            [item.key]: false
                          }));
                          navigate(subItem.path);
                        }}
                        className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                          location.pathname === subItem.path
                            ? 'bg-amber-50 text-amber-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <subItem.icon className="mr-3 h-4 w-4" />
                        {subItem.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom section */}
          <div className="px-3 mt-8 pt-8 border-t border-gray-200">
            <Link
              to="/admin/help"
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <FaQuestionCircle className="mr-3 h-5 w-5" />
              Help & Support
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
              }}
              className="w-full flex items-center px-3 py-2 mt-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50"
            >
              <FaSignOutAlt className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </nav>
      </div>
    </>
  );
};

export default AdminSidebar;
