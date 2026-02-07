import { useEffect, useState } from 'react';
import { manualLogout } from '../../utils/authUtils';
import {
  FaAngleDown, FaAngleRight,
  FaBook,
  FaBriefcase,
  FaCertificate,
  FaChartBar,
  FaChartLine,
  FaCity,
  FaClipboardList,
  FaCog,
  FaCrown,
  FaDatabase,
  FaDollarSign,
  FaEnvelope,
  FaFileAlt,
  FaGlobe,
  FaGraduationCap,
  FaHandshake,
  FaMoneyCheckAlt,
  FaNetworkWired,
  FaQuestionCircle,
  FaShieldAlt,
  FaSignOutAlt,
  FaStore,
  FaTachometerAlt,
  FaUserCog,
  FaUserGraduate,
  FaUsers,
  FaUserShield,
  FaUserTie
} from 'react-icons/fa';
import { MdAttachMoney, MdBusiness, MdDashboard, MdMenuBook, MdMessage, MdSchool, MdSecurity, MdSettings, MdVideoLibrary } from 'react-icons/md';
import { useLocation, useNavigate } from 'react-router-dom';

const SuperAdminSidebar = ({ isOpen, toggleSidebar, activeMenuItem, setActiveMenuItem, closeOnNavigate = true }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState({});

  // Define all menu sections paths based on actual backend API structure
  const menuSections = {
    franchiseAdmins: [
      '/superadmin/franchise-admins/all',
      '/superadmin/franchise-admins/create',
      '/superadmin/franchise-admins/profile',
    ],
    franchiseAgreements: [
      '/superadmin/franchise-agreements/generate',
      '/superadmin/franchise-agreements/upload-approve',
    ],
    ledger: [
      '/superadmin/ledger/dashboard',
      '/superadmin/ledger/transactions',
    ],
    reports: [
      '/superadmin/reports/analytics',
      '/superadmin/reports/financial',
      '/superadmin/reports/performance',
    ],
    compliance: [
      '/superadmin/compliance/audit',
      '/superadmin/compliance/certifications',
      '/superadmin/compliance/policies',
    ],
    settings: [
      '/superadmin/settings/system',
      '/superadmin/settings/users',
      '/superadmin/settings/preferences',
    ],
    materials: [
      '/superadmin/materials/all',
      '/superadmin/materials/upload',
    ],
    enquiries: [
      '/superadmin/system/all-enquiries',
      '/superadmin/system/franchise-enquiries',
    ]
  };

  // Auto-expand menu if current path matches any submenu item
  useEffect(() => {
    console.log('Current path:', location.pathname);
    const newExpandedMenus = {};

    // Check each section to see if current path matches
    Object.keys(menuSections).forEach(key => {
      if (menuSections[key].some(path => location.pathname === path)) {
        console.log('Auto-expanding menu:', key);
        newExpandedMenus[key] = true;
      }
    });

    // Update expanded menus
    setExpandedMenus(prev => {
      // Merge with existing expanded menus
      const merged = { ...prev };
      Object.keys(newExpandedMenus).forEach(key => {
        merged[key] = true;
      });
      console.log('Updated expanded menus:', merged);
      return merged;
    });
  }, [location.pathname]);

  const toggleMenu = (menuKey) => {
    console.log('Toggling menu:', menuKey, 'Current state:', expandedMenus[menuKey]);
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const handleNavigation = (path, title) => {
    console.log('=== NAVIGATION START ===');
    console.log('Navigating to:', path);
    console.log('Title:', title);
    console.log('Current location:', location.pathname);

    // Only call setActiveMenuItem if it's a function
    if (setActiveMenuItem && typeof setActiveMenuItem === 'function') {
      setActiveMenuItem(title);
    }

    navigate(path);

    console.log('Navigation called successfully');
    console.log('=== NAVIGATION END ===');

    // Close sidebar on mobile after selection (only if enabled via `closeOnNavigate` prop)
    if (closeOnNavigate && window.innerWidth < 1024) {
      toggleSidebar();
    }
  };

  const menuItems = [
    {
      key: 'dashboard',
      title: 'Dashboard',
      icon: MdDashboard,
      path: '/superadmin/dashboard',
      badge: 'Main',
      active: location.pathname === '/superadmin/dashboard'
    },

    // === FRANCHISE ADMINS SECTION ===
    {
      key: 'franchiseAdmins',
      title: 'Franchise Admins',
      icon: FaNetworkWired,
      badge: 'Franchise',
      submenu: [
        { title: 'All Franchise Admins', path: '/superadmin/franchise-admins/all', icon: FaUsers },
      ]
    },

    // === FRANCHISE AGREEMENTS SECTION ===
    {
      key: 'franchiseAgreements',
      title: 'Franchise Agreements',
      icon: FaFileAlt,
      badge: 'Legal',
      submenu: [
        { title: 'Generate Agreement', path: '/superadmin/franchise-agreements/generate', icon: FaFileAlt },
        { title: 'Upload / Approve', path: '/superadmin/franchise-agreements/upload-approve', icon: FaClipboardList },
      ]
    },

    // === MATERIALS SECTION ===
    {
      key: 'materials',
      title: 'Materials',
      icon: FaBook,
      path: '/superadmin/materials/all',
      badge: 'Resources'
    },

    // === LEDGER & SETTLEMENT SECTION ===
    {
      key: 'ledger',
      title: 'Ledger & Finance',
      icon: FaDollarSign,
      badge: 'Finance',
      submenu: [
        { title: 'Financial Dashboard', path: '/superadmin/ledger/dashboard', icon: FaTachometerAlt },
        { title: 'Transactions', path: '/superadmin/ledger/transactions', icon: MdAttachMoney },
      ]
    },

    // === ENQUIRIES SECTION ===
    {
      key: 'enquiries',
      title: 'Enquiries',
      icon: FaEnvelope,
      badge: 'Support',
      submenu: [
        { title: 'All Enquiries', path: '/superadmin/system/all-enquiries', icon: FaClipboardList },
        { title: 'Franchise Enquiries', path: '/superadmin/system/franchise-enquiries', icon: FaStore },
      ]
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 md:w-72 transform transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        {/* Main sidebar container with premium gradient */}
        <div className="relative h-full bg-gradient-to-br from-slate-50 via-amber-50/90 to-orange-50/90 backdrop-blur-xl shadow-2xl border-r border-amber-200/60 overflow-hidden">

          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-orange-500/6 to-yellow-500/8 animate-gradient-x pointer-events-none"></div>

          {/* Subtle dot pattern */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: 'radial-gradient(circle, rgba(251, 146, 60, 0.12) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}></div>

          {/* Content wrapper */}
          <div className="relative h-full flex flex-col">

            {/* Logo Section */}
            <div className="relative px-4 sm:px-6 py-4 sm:py-5 border-b border-amber-300/40 bg-gradient-to-r from-amber-100/50 to-orange-100/50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="relative">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/40 transform hover:scale-105 transition-all duration-300">
                      <FaCrown className="text-xl sm:text-2xl text-white drop-shadow-lg" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-amber-700 via-orange-600 to-yellow-700 bg-clip-text text-transparent truncate">
                      CRM Super Admin
                    </h1>
                    <p className="text-xs text-amber-700/80 font-medium truncate">Complete Management System</p>
                  </div>
                </div>

                {/* Close button for mobile */}
                <button
                  onClick={toggleSidebar}
                  className="lg:hidden p-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors shadow-md"
                  aria-label="Close sidebar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Navigation Section */}
            <nav className="flex-1 overflow-y-auto py-3 sm:py-4 px-2 sm:px-3 custom-scrollbar min-h-0">
              <div className="space-y-1">
                {menuItems.map((item) => (
                  <div key={item.key} className="group">
                    {/* Main menu item */}
                    {item.submenu ? (
                      <button
                        onClick={() => {
                          console.log('Menu button clicked:', item.key);
                          toggleMenu(item.key);
                        }}
                        className={`w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${isActive(item)
                          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white shadow-lg shadow-amber-500/50 border border-amber-300/60'
                          : 'text-slate-800 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-900 hover:shadow-md border border-transparent hover:border-amber-200/60'
                          }`}
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                          <item.icon className={`text-base sm:text-lg flex-shrink-0 ${isActive(item) ? 'text-white drop-shadow-md' : 'text-amber-600'} transition-colors`} />
                          <span className="font-medium tracking-wide truncate">{item.title}</span>
                          {item.badge && (
                            <span className={`hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-white rounded-full shadow-md flex-shrink-0 ${item.badge === 'New' ? 'bg-gradient-to-r from-orange-500 to-emerald-500' :
                              item.badge === 'B2B' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                                'bg-gradient-to-r from-purple-500 to-pink-500'
                              }`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className={`transition-transform duration-300 flex-shrink-0 ml-2 ${expandedMenus[item.key] ? 'rotate-180' : ''}`}>
                          {expandedMenus[item.key] ? (
                            <FaAngleDown className={`text-sm sm:text-base ${isActive(item) ? 'text-white' : 'text-amber-600'}`} />
                          ) : (
                            <FaAngleRight className={`text-sm sm:text-base ${isActive(item) ? 'text-white' : 'text-amber-600'}`} />
                          )}
                        </div>
                      </button>

                    ) : (
                      <button
                        onClick={() => {
                          console.log('Direct menu clicked:', item.title, item.path);
                          handleNavigation(item.path, item.title);
                        }}
                        className={`w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${location.pathname === item.path
                          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white shadow-lg shadow-amber-500/50 border border-amber-300/60'
                          : 'text-slate-800 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-900 hover:shadow-md border border-transparent hover:border-amber-200/60'
                          }`}
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                          <item.icon className={`text-base sm:text-lg flex-shrink-0 ${location.pathname === item.path ? 'text-white drop-shadow-md' : 'text-amber-600'} transition-colors`} />
                          <span className="font-medium tracking-wide truncate">{item.title}</span>
                          {item.badge && (
                            <span className={`hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-white rounded-full shadow-md flex-shrink-0 ${item.badge === 'New' ? 'bg-gradient-to-r from-emerald-500 to-orange-500' :
                              item.badge === 'Super Admin' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                                item.badge === 'B2B' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                                  'bg-gradient-to-r from-amber-600 to-orange-600'
                              }`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </button>
                    )}

                    {/* Submenu with smooth animation */}
                    {item.submenu && expandedMenus[item.key] && (
                      <div className="ml-1 sm:ml-2 mt-2 bg-gradient-to-r from-amber-50/80 to-orange-50/80 rounded-xl border border-amber-200/50 shadow-inner backdrop-blur-sm">
                        <div className="p-2 sm:p-3 space-y-1 animate-slideDown">
                          {item.submenu.map((subItem, index) => {
                            console.log('Rendering submenu item:', subItem.title, subItem.path);
                            return (
                              <button
                                key={index}
                                onClick={() => {
                                  console.log('Submenu clicked:', subItem.title, subItem.path);
                                  // Close the dropdown after selecting a submenu item
                                  setExpandedMenus(prev => ({
                                    ...prev,
                                    [item.key]: false
                                  }));
                                  handleNavigation(subItem.path, subItem.title);
                                }}
                                className={`w-full flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-lg transition-all duration-300 transform hover:translate-x-1 hover:scale-[1.02] ${location.pathname === subItem.path
                                  ? 'bg-gradient-to-r from-amber-200 via-orange-200 to-yellow-200 text-amber-900 font-semibold shadow-md border-l-4 border-amber-500 ring-1 ring-amber-300/50'
                                  : 'text-slate-700 hover:bg-gradient-to-r hover:from-amber-100 hover:to-orange-100 hover:text-amber-900 border-l-2 border-amber-300/40 hover:border-amber-500 hover:shadow-sm'
                                  }`}
                              >
                                <subItem.icon className={`text-sm sm:text-base flex-shrink-0 ${location.pathname === subItem.path ? 'text-amber-700' : 'text-amber-600'} transition-colors`} />
                                <span className="font-medium truncate flex-1 text-left">{subItem.title}</span>
                                {location.pathname === subItem.path && (
                                  <div className="ml-auto w-2 h-2 bg-amber-500 rounded-full shadow-sm animate-pulse flex-shrink-0"></div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </nav>

            <div className="relative px-2 sm:px-3 pb-3 sm:pb-4 pt-2 sm:pt-3 border-t border-amber-300/40 bg-gradient-to-r from-amber-50/50 to-orange-50/50 space-y-2 flex-shrink-0">

              {/* <button
                onClick={() => handleNavigation('/superadmin/help', 'Help & Support')}
                className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-semibold text-slate-700 rounded-xl hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-900 transition-all duration-300 border border-transparent hover:border-amber-200/60 hover:shadow-md group"
              >
                <FaQuestionCircle className="text-lg text-amber-600 group-hover:text-amber-700 transition-colors" />
                <span className="font-medium tracking-wide">Help & Support</span>
              </button>
               */}
              {/* Sign Out Button */}
              <button
                onClick={() => {
                  console.log('🚪 Super Admin manual logout initiated');
                  manualLogout(); // Use manual logout function
                }}
                className="w-full flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-red-700 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 border border-red-200/50 hover:border-red-300 hover:shadow-lg hover:shadow-red-500/20 transition-all duration-300 transform hover:scale-[1.02] group"
              >
                <FaSignOutAlt className="text-base sm:text-lg text-red-600 group-hover:text-red-700 transition-colors flex-shrink-0" />
                <span className="font-medium tracking-wide truncate">Sign Out</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(251, 146, 60, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #f59e0b, #f97316);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #d97706, #ea580c);
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes gradient-x {
          0%, 100% {
            transform: translateX(0%);
          }
          50% {
            transform: translateX(100%);
          }
        }
        .animate-gradient-x {
          animation: gradient-x 15s ease infinite;
        }
      `}</style>
    </>
  );
};

export default SuperAdminSidebar;
