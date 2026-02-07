import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserData } from '../utils/authUtils';
import { logout } from '../utils/enhancedAuthUtils';

const StudentLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [activeMenuItem, setActiveMenuItem] = useState('');

  useEffect(() => {
    const user = getUserData();
    if (!user) {
      navigate('/student/login');
      return;
    }
    setStudentData(user);
  }, [navigate]);

  // Determine active menu based on current path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/student/test')) {
      setActiveMenuItem('OnlineTest');
    } else if (path.includes('/student/test-result')) {
      setActiveMenuItem('Results');
    } else if (path.includes('/students/my-courses')) {
      setActiveMenuItem('MyCourses');
    }
  }, [location.pathname]);

  const menuItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: '📊', path: '/students' },
    { id: 'Profile', label: 'Profile', icon: '👤', path: '/students' },
    { id: 'MyCourses', label: 'My Courses', icon: '🎓', path: '/students/my-courses' },
    { id: 'StudyMaterial', label: 'Study Material', icon: '📚', path: '/students' },
    { id: 'VideoClasses', label: 'Video Classes', icon: '🎥', path: '/students' },
    { id: 'OnlineTest', label: 'Online Test', icon: '📝', path: '/students' },
    { id: 'Results', label: 'Result / Certi / Marksheet', icon: '🎖️', path: '/students' }
  ];

  // Debug: Log menu items to ensure they're loaded
  console.log('Menu Items:', menuItems);

  const handleLogout = () => {
    try {
      logout();
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const handleMenuClick = (item) => {
    navigate(item.path);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-teal-600 to-teal-700 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out z-50 flex flex-col shadow-2xl`}>
        {/* Sidebar Header */}
        <div className="p-4 bg-teal-800/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
           
            <span className="text-white font-semibold text-sm">Student Portal</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item)}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-all ${
                activeMenuItem === item.id
                  ? 'bg-white text-teal-700 shadow-lg font-semibold'
                  : 'text-white hover:bg-teal-500/30'
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        
        {/* Logout Button */}
        <div className="px-3 pb-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 rounded-lg text-left transition-all text-white hover:bg-red-500/30 border border-red-400/50"
          >
            <span className="mr-3 text-lg">🚪</span>
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Header */}
        <div className="bg-white shadow-md sticky top-0 z-30 border-b border-gray-200">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                  Welcome, {studentData?.name?.split(' ')[0] || 'Student'} 👋
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Student Portal
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => navigate('/students')}
                className="text-gray-600 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                title="Dashboard"
              >
                <span className="text-2xl">🏠</span>
              </button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="w-full">
          {children}
        </div>
      </div>
    </div>
  );
};

export default StudentLayout;
