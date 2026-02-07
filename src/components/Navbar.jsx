import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaBars, FaTimes, FaUserCircle } from "react-icons/fa";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { logout, navigateToRoleDashboard } from "../utils/authUtils";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSignInDropdown, setShowSignInDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuthStatus = () => {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");

      if (token && userData) {
        setIsLoggedIn(true);
        try {
          setUser(JSON.parse(userData));
        } catch (error) {
          console.error("Error parsing user data:", error);
          setUser(null);
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    };

    // Check auth status initially
    checkAuthStatus();

    // Listen for storage events (logout from other tabs or explicit auth changes)
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'user' || e.key === null) {
        checkAuthStatus();
      }
    };

    // Listen for custom auth events
    const handleAuthChange = () => {
      checkAuthStatus();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChanged', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, []);

  // Debug mobile menu state and manage body scroll
  useEffect(() => {
    console.log('🔄 Mobile menu state changed:', mobileMenuOpen);
    console.log('📋 NavItems array:', navItems);
    
    // Prevent body scroll when mobile menu is open
    if (mobileMenuOpen) {
      document.body.classList.add('mobile-menu-open');
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      console.log('🚫 Body scroll disabled - mobile menu opened');
    } else {
      document.body.classList.remove('mobile-menu-open');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      console.log('✅ Body scroll enabled - mobile menu closed');
    }

    // Test menu elements when opened
    if (mobileMenuOpen) {
      setTimeout(() => {
        const menuElements = document.querySelectorAll('.mobile-menu-content button');
        console.log('🔍 Found', menuElements.length, 'menu buttons');
        menuElements.forEach((btn, idx) => {
          console.log(`Button ${idx + 1}:`, btn.textContent?.trim());
        });
      }, 100);
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('mobile-menu-open');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [mobileMenuOpen]);

  const navItems = [
    { name: "Home", link: "/" },
    { name: "About Us", link: "/about" },
    { name: "Collaboration", link: "/collaboration" },
    { name: "Opportunities", link: "/opportunities" },
    { name: "Explore Courses", link: "/courses-offer" },
    { name: "Contact", link: "/contactus" }
  ];

  const navigateToDashboard = () => {
    navigateToRoleDashboard(navigate, user?.role);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'auto' }); // Changed to 'auto' for instant scroll
  };

  // Optimized navigation handler for fast page loads
  const handleNavigation = (link, callback) => {
    console.log('🔗 Navigating to:', link);
    try {
      navigate(link);
      if (callback) callback();
      // Scroll after navigation to prevent layout shift
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
      });
      console.log('✅ Navigation successful to:', link);
    } catch (error) {
      console.error('❌ Navigation error:', error);
    }
  };

  return (
    <nav className="relative bg-gradient-to-r from-amber-50/95 via-yellow-50/95 to-orange-50/95 backdrop-blur-lg w-full sticky top-0 z-40 border-b border-amber-200/50 shadow-xl shadow-amber-100/40">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/8 via-amber-500/8 to-orange-500/8 animate-gradient-x opacity-60"></div>
      
      {/* Subtle dot pattern overlay */}
      <div className="absolute inset-0 opacity-25" 
           style={{
             backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(245,158,11,0.2) 1px, transparent 0)',
             backgroundSize: '20px 20px'
           }}></div>
      
      <div className="relative flex flex-row items-center justify-between w-full h-[80px] px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
        {/* Logo Section */}
        <div
          className="flex items-center cursor-pointer transition-all duration-300 hover:scale-105 group"
          onClick={() => handleNavigation("/")}
        >
          <div className="relative">
            {/* Logo background glow */}
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-400/25 to-yellow-400/25 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <img 
              src="/LondonLogo.png" 
              alt="Skill Wallah EdTech" 
              className="relative h-[75px] w-auto drop-shadow-lg filter group-hover:brightness-110 transition-all duration-300" 
            />
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="lg:hidden flex items-center z-50 relative">
          <button
            className={`text-3xl focus:outline-none transition-all duration-300 p-4 rounded-xl shadow-lg backdrop-blur-sm transform hover:scale-105 ${
              mobileMenuOpen 
                ? 'text-red-600 bg-red-50 border-2 border-red-300 hover:border-red-400' 
                : 'text-amber-700 bg-white/90 border-2 border-amber-200 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-100'
            }`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🍔 Mobile menu button clicked! Current state:', mobileMenuOpen);
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            style={{ zIndex: 999998 }}
          >
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
          
          {/* Menu Status Indicator */}
          {mobileMenuOpen && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex flex-1 items-center justify-center">
          <div className="flex items-center">
            {navItems.map((item, idx) => (
              <div key={idx} className="flex items-center">
                <button
                  onClick={() => handleNavigation(item.link)}
                  className={`relative text-amber-900 font-medium text-base hover:text-amber-700 transition-all duration-300 px-4 py-2 rounded-lg group ${
                    location.pathname === item.link ? 'text-amber-800 bg-amber-100/70' : 'hover:bg-white/70'
                  }`}
                >
                  <span className="relative z-10">{item.name}</span>
                  {/* Hover effect background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400/15 to-yellow-400/15 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
                {idx < navItems.length - 1 && (
                  <span className="text-amber-300 text-lg font-light mx-1">|</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sign In Button / User Menu */}
        <div className="hidden lg:flex items-center">
          {!isLoggedIn ? (
            /* Sign In Button for Non-Logged Users */
            <div className="relative">
              <button
                onClick={() => setShowSignInDropdown((prev) => !prev)}
                className="bg-gradient-to-r from-amber-600 to-yellow-600 text-white text-base py-2.5 px-6 rounded-lg hover:from-amber-700 hover:to-yellow-700 focus:outline-none transition-all duration-300 flex items-center font-medium shadow-md hover:shadow-lg hover:shadow-amber-500/25 border border-amber-600/20 font-semibold"
              >
                <span className="text-white font-semibold">Sign In</span>
                <span className="ml-2 text-sm text-white">▼</span>
              </button>
              {showSignInDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-2 backdrop-blur-sm">
                  <button 
                    className="flex items-center px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition font-medium w-full text-left rounded-md mx-1"
                    onClick={() => {
                      handleNavigation("/super-admin-login", () => setShowSignInDropdown(false));
                    }}
                  >
                    <span className="mr-3">👑</span> Master Franchises Login
                  </button>
                  <button 
                    className="flex items-center px-4 py-3 text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition font-medium w-full text-left rounded-md mx-1"
                    onClick={() => {
                      handleNavigation("/admin-login", () => setShowSignInDropdown(false));
                    }}
                  >
                    <span className="mr-3">👨‍💼</span> Franchise Login
                  </button>
                  <button 
                    className="flex items-center px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition font-medium w-full text-left rounded-md mx-1"
                    onClick={() => {
                      handleNavigation("/branch-login", () => setShowSignInDropdown(false));
                    }}
                  >
                    <span className="mr-3">🏢</span> Branch Login
                  </button>
                  <button 
                    className="flex items-center px-4 py-3 text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition font-medium w-full text-left rounded-md mx-1"
                    onClick={() => {
                      handleNavigation("/student-login", () => setShowSignInDropdown(false));
                    }}
                  >
                    <span className="mr-3">👨‍🎓</span> Student Login
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* User Menu for Logged In Users */
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown((prev) => !prev)}
                className="flex items-center space-x-2 hover:bg-amber-50 rounded-lg p-2 transition-colors"
              >
                <FaUserCircle className="text-3xl text-amber-600" />
                <span className="text-sm font-medium text-gray-700">{user?.name || 'User'}</span>
                <span className="text-sm text-gray-400">▼</span>
              </button>
              
              {/* Transparent Blurred Backdrop */}
              {showUserDropdown && (
                <div 
                  className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40"
                  onClick={() => setShowUserDropdown(false)}
                />
              )}
              
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-200 z-50 py-2">
                  <button 
                    onClick={() => {
                      navigateToDashboard();
                      setShowUserDropdown(false);
                    }}
                    className="flex items-center px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition font-medium w-full text-left rounded-md mx-1"
                  >
                    <span className="mr-3">📊</span> Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                    }}
                    className="flex items-center px-4 py-3 text-red-600 hover:bg-red-50 transition font-medium w-full text-left rounded-md mx-1"
                  >
                    <span className="mr-3">🚪</span> Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Portal */}
        {mobileMenuOpen && createPortal(
          <div 
            className="mobile-menu-overlay fixed inset-0 bg-black bg-opacity-60 flex justify-end lg:hidden"
            style={{ zIndex: 999999 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                console.log('🚫 Mobile menu backdrop clicked, closing menu');
                setMobileMenuOpen(false);
              }
            }}
          >
            <div 
              className="mobile-menu-content bg-white w-80 max-w-[85vw] h-full shadow-2xl flex flex-col relative animate-slide-in-right"
              style={{ zIndex: 1000000 }}
              onClick={(e) => {
                e.stopPropagation();
                console.log('📱 Mobile menu content clicked - staying open');
              }}
            >
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center">
                  <img src="/logosingle.png" alt="Logo" className="h-10 w-10 mr-3" />
                  <span className="text-amber-600 font-bold text-lg">Skill Wallah EdTech</span>
                </div>
                <button
                  className="text-gray-600 text-2xl focus:outline-none hover:text-amber-600 transition-colors hover:bg-amber-100 rounded-lg p-2"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Mobile Navigation */}
              <div className="flex flex-col flex-1 overflow-y-auto py-6">
                <div className="px-4 space-y-2">
                  <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-4 px-2">Menu</h3>
                  {navItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('📱 Mobile nav click - Navigating to:', item.link, 'Item:', item.name);
                        handleNavigation(item.link);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center w-full text-left px-4 py-4 text-gray-800 font-semibold text-base hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200 border-l-4 border-transparent hover:border-amber-500 ${
                        location.pathname === item.link ? 'text-amber-600 bg-amber-100 border-l-amber-600' : ''
                      }`}
                    >
                      <span className="mr-4 text-lg">
                        {item.name === 'Home' && '🏠'}
                        {item.name === 'About Us' && 'ℹ️'}
                        {item.name === 'Collaboration' && '🤝'}
                        {item.name === 'Opportunities' && '💼'}
                        {item.name === 'Explore Courses' && '📚'}
                        {item.name === 'Contact' && '📞'}
                      </span>
                      <span className="text-base font-medium">{item.name}</span>
                    </button>
                  ))}
                </div>

                {/* Mobile Sign In Section */}
                {!isLoggedIn && (
                  <div className="px-4 py-4 border-t border-gray-200 mt-auto bg-gray-50">
                    <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-4 px-2">Sign In</h3>
                    <div className="space-y-2">
                      <button 
                        className="flex items-center w-full px-4 py-3 text-gray-800 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-all duration-200 font-medium border-l-4 border-transparent hover:border-purple-500"
                        onClick={() => {
                          handleNavigation("/super-admin-login");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="mr-4 text-lg">👑</span> <span className="font-semibold">Super Admin Login</span>
                      </button>
                      <button 
                        className="flex items-center w-full px-4 py-3 text-gray-800 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-all duration-200 font-medium border-l-4 border-transparent hover:border-amber-500"
                        onClick={() => {
                          handleNavigation("/admin-login");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="mr-4 text-lg">👨‍💼</span> <span className="font-semibold">Admin Login</span>
                      </button>
                      <button 
                        className="flex items-center w-full px-4 py-3 text-gray-800 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200 font-medium border-l-4 border-transparent hover:border-blue-500"
                        onClick={() => {
                          handleNavigation("/branch-login");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="mr-4 text-lg">🏢</span> <span className="font-semibold">Branch Login</span>
                      </button>
                      <button 
                        className="flex items-center w-full px-4 py-3 text-gray-800 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-all duration-200 font-medium border-l-4 border-transparent hover:border-amber-500"
                        onClick={() => {
                          handleNavigation("/student-login");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <span className="mr-4 text-lg">👨‍🎓</span> <span className="font-semibold">Student Login</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* User Menu for Logged In Users */}
                {isLoggedIn && (
                  <div className="px-4 py-4 border-t border-gray-200 mt-auto bg-gray-50">
                    <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-4 px-2">My Account</h3>
                    <div className="space-y-2">
                      <button 
                        onClick={() => {
                          navigateToDashboard();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-3 text-gray-800 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-all duration-200 font-medium border-l-4 border-transparent hover:border-amber-500"
                      >
                        <span className="mr-4 text-lg">📊</span> <span className="font-semibold">Dashboard</span>
                      </button>
                      <NavLink 
                        to="/profile" 
                        className="flex items-center w-full px-4 py-3 text-gray-800 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-all duration-200 font-medium border-l-4 border-transparent hover:border-amber-500" 
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className="mr-4 text-lg">👤</span> <span className="font-semibold">My Profile</span>
                      </NavLink>
                      <button
                        className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium border-l-4 border-transparent hover:border-red-400"
                        onClick={() => { 
                          setMobileMenuOpen(false); 
                          logout(); 
                        }}
                      >
                        <span className="mr-4 text-lg">🚪</span> <span className="font-semibold">Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </nav>
  );
};
export default Navbar;