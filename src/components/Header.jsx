
import { useEffect, useRef, useState } from 'react';
import { FaBars, FaCog, FaSignOutAlt, FaUser, FaUserCircle } from 'react-icons/fa';

const Header = ({ onMenuClick }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  const user = {
    name: 'Mohd Soyeb',
    email: 'soyeb@example.com'
  };

  const handleLogout = () => {
    // Check if user is super admin - don't clear their tokens
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'super_admin') {
      // For super admin, redirect to super admin dashboard instead of clearing
      window.location.href = "/super-admin/dashboard";
    } else {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-white shadow-sm border-b border-primary-100 flex items-center justify-between px-4 py-3">
      <button className="text-2xl text-secondary-600 md:hidden hover:text-primary-600 transition-colors" onClick={onMenuClick}>
        <FaBars />
      </button>

      <div className="relative ml-auto" ref={dropdownRef}>
        <button
          className="flex items-center space-x-2 hover:bg-primary-50 rounded-lg p-2 transition-colors"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <FaUserCircle className="text-3xl text-primary-600" />
          <span className="hidden md:block text-sm font-medium text-secondary-700">{user.name}</span>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-primary-100 z-10">
            <div className="px-4 py-2 border-b border-primary-100 text-sm text-secondary-600">{user.email}</div>
            <a
              href="/user-profile"
              className="block px-4 py-2 text-sm hover:bg-primary-50 hover:text-primary-600 flex items-center gap-2 transition-colors"
            >
              <FaUser /> Profile
            </a>
            <a
              href="/settings"
              className="block px-4 py-2 text-sm hover:bg-primary-50 hover:text-primary-600 flex items-center gap-2 transition-colors"
            >
              <FaCog /> Settings
            </a>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm hover:bg-error-50 text-error-600 flex items-center gap-2 transition-colors"
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
