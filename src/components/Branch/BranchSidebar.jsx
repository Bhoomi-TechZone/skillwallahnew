import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import {
  FaTachometerAlt,
  FaWallet,
  FaUsers,
  FaUserTie,
  FaUserGraduate,
  FaBook,
  FaBookOpen,
  FaClipboardCheck,
  FaCertificate,
  FaChartBar,
  FaDollarSign,
  FaReceipt,
  FaChevronDown,
  FaChevronUp,
  FaUserCircle,
  FaBuilding,
  FaClipboardList,
  FaIdCard,
  FaVideo,
  FaClipboard,
  FaQuestion,
  FaTrophy,
  FaFileInvoice,
  FaCog
} from 'react-icons/fa';

const BranchSidebar = ({ isCollapsed = false, isHovering = false, onItemClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});
  const [userName, setUserName] = useState('User'); // Dynamic username from auth
  const [userRole, setUserRole] = useState(() => {
    // Initialize with current role to avoid race conditions
    const currentUser = authService.getCurrentUser();
    return currentUser?.role || null;
  });

  // Get current user role and profile on component mount
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      if (currentUser.role) {
        setUserRole(currentUser.role);
        console.log('Current user role set:', currentUser.role);
      }
      if (currentUser.name || currentUser.username || currentUser.email) {
        const displayName = currentUser.name || currentUser.username || currentUser.email || 'User';
        setUserName(displayName);
        console.log('Current user name set:', displayName);
      }
    } else {
      console.warn('No user found, user might not be authenticated');
    }

    // Auto-expand menu items based on current active path
    const newExpandedItems = {};

    // Check each navigation item to see if any of its submenu items are active
    navigationItems.forEach(item => {
      if (item.hasSubmenu && item.submenu) {
        const hasActiveSubmenu = item.submenu.some(subItem => {
          // Handle role-based paths
          if (subItem.roleBasedPath) {
            const currentRole = currentUser?.role;

            // Handle Manage Students
            if (subItem.title === 'Manage Students') {
              if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                return isActive('/Branch/ManageStudents');
              } else {
                return isActive('/branch/students/registration');
              }
            }

            // Handle ID Card
            if (subItem.title === 'ID Card') {
              if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                return isActive('/admin/students/id-cards');
              } else {
                return isActive('/branch/students/id-cards');
              }
            }

            // Handle Courses sub tabs
            if (subItem.title === 'Program') {
              if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                return isActive('/admin/courses/programs');
              } else {
                return isActive('/branch/courses/programs');
              }
            }

            if (subItem.title === 'Courses') {
              if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                return isActive('/admin/courses/manage');
              } else {
                return isActive('/branch/courses/courses');
              }
            }

            if (subItem.title === 'Subject') {
              if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                return isActive('/admin/courses/subjects');
              } else {
                return isActive('/branch/courses/subjects');
              }
            }

            if (subItem.title === 'Batch') {
              if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                return isActive('/admin/courses/batches');
              } else {
                return isActive('/branch/courses/batches');
              }
            }

            // Handle Study Materials sub tabs
            if (subItem.title === 'Syllabus') {
              if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                return isActive('/branch/study-materials/admin-syllabus');
              } else {
                return isActive('/branch/study-materials/syllabus');
              }
            }

            if (subItem.title === 'Study Materials') {
              if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                return isActive('/branch/study-materials/admin-materials');
              } else {
                return isActive('/branch/study-materials/materials');
              }
            }

            if (subItem.title === 'Video Classes') {
              if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                return isActive('/branch/study-materials/admin-videos');
              } else {
                return isActive('/branch/study-materials/videos');
              }
            }

            // Handle Online Exam sub tabs
            if (subItem.title === 'Paper Set') {
              if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                return isActive('/branch/exams/admin-paper-sets');
              } else {
                return isActive('/branch/exams/paper-sets');
              }
            }

            if (subItem.title === 'Question') {
              if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                return isActive('/branch/exams/admin-questions');
              } else {
                return isActive('/branch/exams/questions');
              }
            }

            if (subItem.title === 'Result') {
              if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                return isActive('/branch/exams/admin-results');
              } else {
                return isActive('/branch/exams/results');
              }
            }

            // Handle Income tabs
            if (subItem.title === 'Income Head') {
              if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                return isActive('/admin/incomes/heads');
              } else {
                return isActive('/branch/incomes/heads');
              }
            }

            if (subItem.title === 'Income Report') {
              if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                return isActive('/admin/incomes/report');
              } else {
                return isActive('/branch/incomes/report');
              }
            }

            // Handle Expenses tabs
            if (subItem.title === 'Manage Heads') {
              if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                return isActive('/admin/expenses/heads');
              } else {
                return isActive('/branch/expenses/heads');
              }
            }

            if (subItem.title === 'Expense Report') {
              if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                return isActive('/admin/expenses/report');
              } else {
                return isActive('/branch/expenses/report');
              }
            }

            // Default fallback for other role-based paths
            return isActive(subItem.path);
          }
          return isActive(subItem.path);
        });

        if (hasActiveSubmenu) {
          newExpandedItems[item.key] = true;
        }
      }
    });

    // Specific handling for known paths
    if (location.pathname === '/admin/branches' || location.pathname.startsWith('/admin/branches')) {
      newExpandedItems['maaster-panel'] = true;
    }

    setExpandedItems(prev => ({
      ...prev,
      ...newExpandedItems
    }));
  }, [location.pathname]);

  // Toggle expanded state for menu items with submenus
  // Only one submenu can be open at a time
  const toggleExpanded = (itemKey) => {
    setExpandedItems(prev => {
      const isCurrentlyExpanded = prev[itemKey];

      if (isCurrentlyExpanded) {
        // If the clicked item is already expanded, just close it
        return {
          ...prev,
          [itemKey]: false
        };
      } else {
        // If the clicked item is not expanded, close all others and open this one
        const newExpandedItems = {};
        // Close all other items
        Object.keys(prev).forEach(key => {
          newExpandedItems[key] = false;
        });
        // Open the clicked item
        newExpandedItems[itemKey] = true;

        return newExpandedItems;
      }
    });
  };

  // Check if current path matches the item path
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Navigation handler with role-based routing
  const handleNavigation = (path, item = null) => {
    // Handle role-based routing for Dashboard
    if (item && item.title === 'Dashboard') {
      console.log('Dashboard clicked - User role:', userRole);

      // Get current user role - always fetch fresh from authService
      const currentUser = authService.getCurrentUser();
      const currentRole = currentUser?.role;

      console.log('Current user from auth service:', currentUser);
      console.log('Current role from auth service:', currentRole);

      // Ensure we have a valid role before routing
      if (!currentRole) {
        console.warn('No role found, cannot determine dashboard route');
        return;
      }

      // Route based on user role
      if (currentRole === 'admin') {
        console.log('Routing to admin dashboard for admin role:', currentRole);
        navigate('/branch/admin-dashboard'); // AdminDashboard.jsx - for super admin
      } else if (currentRole === 'franchise_admin') {
        console.log('Routing to admin dashboard for franchise_admin role:', currentRole);
        navigate('/branch/admin-dashboard'); // AdminDashboard.jsx - for franchise admin
      } else if (currentRole === 'branch_admin') {
        console.log('Routing to branch dashboard for branch_admin role:', currentRole);
        navigate('/branch/dashboard'); // BranchDashboard.jsx - for branch admin
      } else {
        console.log('Unknown role, defaulting to branch dashboard. Role:', currentRole);
        navigate('/branch/dashboard');
      }
      return;
    }

    // Handle role-based routing for Manage Branches
    if (item && item.title === 'Manage Branches') {
      console.log('Manage Branches clicked - User role:', userRole);
      navigate('/admin/branches');
      return;
    }

    // Handle role-based routing for specific menu items
    if (item && item.roleBasedPath && item.title === 'Manage Students') {
      if (userRole === 'admin' || userRole === 'franchise_admin') {
        // Only franchise_admin and admin users go to ManageStudents page
        navigate('/Branch/ManageStudents');
      } else if (userRole === 'branch' || userRole === 'branch_admin') {
        // Branch and branch_admin users go to StudentRegistration page
        navigate('/branch/students/registration');
      } else {
        // Default fallback to registration for other roles
        navigate('/branch/students/registration');
      }
      return;
    }

    // Handle role-based routing for ID Card
    if (item && item.title === 'ID Card') {
      if (userRole === 'admin' || userRole === 'franchise_admin') {
        navigate('/admin/students/id-cards');
      } else if (userRole === 'branch_admin') {
        navigate('/branch/students/id-cards');
      } else {
        // Default fallback for other roles (branch users might not have access)
        navigate('/branch/students/id-cards');
      }
      return;
    }

    // Handle role-based routing for Admit Card
    if (item && item.title === 'Admit Card') {
      if (userRole === 'admin' || userRole === 'franchise_admin') {
        navigate('/admin/students/admit-cards');
      } else if (userRole === 'branch_admin') {
        navigate('/branch/students/admit-cards');
      } else {
        // Default fallback for other roles (branch users might not have access)
        navigate('/branch/students/admit-cards');
      }
      return;
    }

    // Handle role-based routing for Courses
    if (item && item.title === 'Courses') {
      if (userRole === 'admin' || userRole === 'franchise_admin') {
        navigate('/admin/courses/manage');
      } else if (userRole === 'branch_admin') {
        navigate('/branch/courses/courses');
      } else {
        // Default fallback for other roles (branch users might not have access)
        navigate('/branch/courses/courses');
      }
      return;
    }

    // Handle role-based routing for Subject
    if (item && item.title === 'Subject') {
      if (userRole === 'admin' || userRole === 'franchise_admin') {
        navigate('/admin/courses/subjects');
      } else if (userRole === 'branch_admin') {
        navigate('/branch/courses/subjects');
      } else {
        // Default fallback for other roles (branch users might not have access)
        navigate('/branch/courses/subjects');
      }
      return;
    }

    // Handle role-based routing for Program
    if (item && item.title === 'Program') {
      if (userRole === 'admin' || userRole === 'franchise_admin') {
        navigate('/admin/courses/programs');
      } else if (userRole === 'branch_admin') {
        navigate('/branch/courses/programs');
      } else {
        // Default fallback for other roles (branch users might not have access)
        navigate('/branch/courses/programs');
      }
      return;
    }

    // Handle role-based routing for Batch
    if (item && item.title === 'Batch') {
      if (userRole === 'admin' || userRole === 'franchise_admin') {
        navigate('/admin/courses/batches');
      } else if (userRole === 'branch_admin') {
        navigate('/branch/courses/batches');
      } else {
        // Default fallback for other roles (branch users might not have access)
        navigate('/branch/courses/batches');
      }
      return;
    }

    // Handle role-based routing for Marksheet/Certificate
    if (item && item.title === 'Marksheet / Certificate') {
      console.log('Marksheet/Certificate clicked - User role:', userRole);

      // Get current user role if not already set
      const currentUser = authService.getCurrentUser();
      const currentRole = userRole || (currentUser && currentUser.role);

      console.log('Current role from auth service:', currentRole);

      if (currentRole === 'admin' || currentRole === 'franchise_admin') {
        console.log('Navigating to admin certificates/marksheets');
        navigate('/branch/admin-certificates-marksheets');
      } else if (currentRole === 'branch_admin') {
        console.log('Navigating to branch certificates/marksheets');
        navigate('/branch/certificates-marksheets');
      } else {
        console.log('Unknown role or role not set, defaulting to branch view');
        navigate('/branch/certificates-marksheets');
      }
      return;
    }

    // Handle role-based routing for Paper Set
    if (item && item.title === 'Paper Set') {
      console.log('Paper Set clicked - User role:', userRole);

      // Get current user role if not already set
      const currentUser = authService.getCurrentUser();
      const currentRole = userRole || (currentUser && currentUser.role);

      console.log('Current role from auth service:', currentRole);

      if (currentRole === 'admin' || currentRole === 'franchise_admin') {
        console.log('Navigating to admin paper sets');
        navigate('/branch/exams/admin-paper-sets');
      } else if (currentRole === 'branch_admin') {
        console.log('Navigating to branch paper sets');
        navigate('/branch/exams/paper-sets');
      } else {
        console.log('Unknown role or role not set, defaulting to branch view');
        navigate('/branch/exams/paper-sets');
      }
      return;
    }

    // Handle role-based routing for Question
    if (item && item.title === 'Question') {
      console.log('Question clicked - User role:', userRole);

      // Get current user role if not already set
      const currentUser = authService.getCurrentUser();
      const currentRole = userRole || (currentUser && currentUser.role);

      console.log('Current role from auth service:', currentRole);

      if (currentRole === 'admin' || currentRole === 'franchise_admin') {
        console.log('Navigating to admin questions');
        navigate('/branch/exams/admin-questions');
      } else if (currentRole === 'branch_admin') {
        console.log('Navigating to branch questions');
        navigate('/branch/exams/questions');
      } else {
        console.log('Unknown role or role not set, defaulting to branch view');
        navigate('/branch/exams/questions');
      }
      return;
    }

    // Handle role-based routing for Study Materials
    if (item && item.title === 'Study Materials') {
      console.log('Study Materials clicked - User role:', userRole);

      // Get current user role if not already set
      const currentUser = authService.getCurrentUser();
      const currentRole = userRole || (currentUser && currentUser.role);

      console.log('Current role from auth service:', currentRole);

      if (currentRole === 'admin' || currentRole === 'franchise_admin') {
        console.log('Navigating to admin study materials');
        navigate('/branch/study-materials/admin-materials');
      } else if (currentRole === 'branch_admin') {
        console.log('Navigating to branch study materials');
        navigate('/branch/study-materials/materials');
      } else {
        console.log('Unknown role or role not set, defaulting to branch view');
        navigate('/branch/study-materials/materials');
      }
      return;
    }

    // Handle role-based routing for Syllabus
    if (item && item.title === 'Syllabus') {
      console.log('Syllabus clicked - User role:', userRole);

      // Get current user role if not already set
      const currentUser = authService.getCurrentUser();
      const currentRole = userRole || (currentUser && currentUser.role);

      console.log('Current role from auth service:', currentRole);

      if (currentRole === 'admin' || currentRole === 'franchise_admin') {
        console.log('Navigating to admin syllabus');
        navigate('/branch/study-materials/admin-syllabus');
      } else if (currentRole === 'branch_admin') {
        console.log('Navigating to branch syllabus');
        navigate('/branch/study-materials/syllabus');
      } else {
        console.log('Unknown role or role not set, defaulting to branch view');
        navigate('/branch/study-materials/syllabus');
      }
      return;
    }

    // Handle role-based routing for Video Classes
    if (item && item.title === 'Video Classes') {
      console.log('Video Classes clicked - User role:', userRole);

      // Get current user role if not already set
      const currentUser = authService.getCurrentUser();
      const currentRole = userRole || (currentUser && currentUser.role);

      console.log('Current role from auth service:', currentRole);

      if (currentRole === 'admin' || currentRole === 'franchise_admin') {
        console.log('Navigating to admin video classes');
        navigate('/branch/study-materials/admin-videos');
      } else if (currentRole === 'branch_admin') {
        console.log('Navigating to branch video classes');
        navigate('/branch/study-materials/videos');
      } else {
        console.log('Unknown role or role not set, defaulting to branch view');
        navigate('/branch/study-materials/videos');
      }
      return;
    }

    // Handle role-based routing for Result
    if (item && item.title === 'Result') {
      console.log('Result clicked - User role:', userRole);

      // Get current user role if not already set
      const currentUser = authService.getCurrentUser();
      const currentRole = userRole || (currentUser && currentUser.role);

      console.log('Current role from auth service:', currentRole);

      if (currentRole === 'admin' || currentRole === 'franchise_admin') {
        console.log('Navigating to admin results');
        navigate('/branch/exams/admin-results');
      } else if (currentRole === 'branch_admin') {
        console.log('Navigating to branch results');
        navigate('/branch/exams/results');
      } else {
        console.log('Unknown role or role not set, defaulting to branch view');
        navigate('/branch/exams/results');
      }
      return;
    }

    // Handle role-based routing for Income Head
    if (item && item.title === 'Income Head') {
      console.log('Income Head clicked - User role:', userRole);

      // Get current user role if not already set
      const currentUser = authService.getCurrentUser();
      const currentRole = userRole || (currentUser && currentUser.role);

      console.log('Current role from auth service:', currentRole);

      if (currentRole === 'admin' || currentRole === 'franchise_admin') {
        console.log('Navigating to admin income heads');
        navigate('/admin/incomes/heads');
      } else if (currentRole === 'branch_admin') {
        console.log('Navigating to branch income heads');
        navigate('/branch/incomes/heads');
      } else {
        console.log('Unknown role or role not set, defaulting to branch view');
        navigate('/branch/incomes/heads');
      }
      return;
    }

    // Handle role-based routing for Income Report
    if (item && item.title === 'Income Report') {
      console.log('Income Report clicked - User role:', userRole);

      // Get current user role if not already set
      const currentUser = authService.getCurrentUser();
      const currentRole = userRole || (currentUser && currentUser.role);

      console.log('Current role from auth service:', currentRole);

      if (currentRole === 'admin' || currentRole === 'franchise_admin') {
        console.log('Navigating to admin income report');
        navigate('/admin/incomes/report');
      } else if (currentRole === 'branch_admin') {
        console.log('Navigating to branch income report');
        navigate('/branch/incomes/report');
      } else {
        console.log('Unknown role or role not set, defaulting to branch view');
        navigate('/branch/incomes/report');
      }
      return;
    }

    // Handle role-based routing for Manage Heads (Expense)
    if (item && item.title === 'Manage Heads') {
      console.log('Manage Heads (Expense) clicked - User role:', userRole);

      // Get current user role if not already set
      const currentUser = authService.getCurrentUser();
      const currentRole = userRole || (currentUser && currentUser.role);

      console.log('Current role from auth service:', currentRole);

      if (currentRole === 'admin' || currentRole === 'franchise_admin') {
        console.log('Navigating to admin expense heads');
        navigate('/admin/expenses/heads');
      } else if (currentRole === 'branch_admin') {
        console.log('Navigating to branch expense heads');
        navigate('/branch/expenses/heads');
      } else {
        console.log('Unknown role or role not set, defaulting to branch view');
        navigate('/branch/expenses/heads');
      }
      return;
    }

    // Handle role-based routing for Expense Report
    if (item && item.title === 'Expense Report') {
      console.log('Expense Report clicked - User role:', userRole);

      // Get current user role if not already set
      const currentUser = authService.getCurrentUser();
      const currentRole = userRole || (currentUser && currentUser.role);

      console.log('Current role from auth service:', currentRole);

      if (currentRole === 'admin' || currentRole === 'franchise_admin') {
        console.log('Navigating to admin expense report');
        navigate('/admin/expenses/report');
      } else if (currentRole === 'branch_admin') {
        console.log('Navigating to branch expense report');
        navigate('/branch/expenses/report');
      } else {
        console.log('Unknown role or role not set, defaulting to branch view');
        navigate('/branch/expenses/report');
      }
      return;
    }

    if (path) {
      navigate(path);
    }
  };

  // Main navigation items configuration
  const navigationItems = [
    {
      key: 'dashboard',
      title: 'Dashboard',
      icon: FaTachometerAlt,
      path: null, // Will be dynamically set based on role
      color: 'text-amber-600',
      roleBasedPath: true // Flag to indicate this path is role-based
    },
    {
      key: 'recharge-wallet',
      title: 'Recharge Wallet',
      icon: FaWallet,
      path: '/branch/wallet',
      color: 'text-amber-600',
      branchAdminOnly: true // Only visible to branch_admin users
    },
    {
      key: 'maaster-panel',
      title: 'Master Panel',
      icon: FaUsers,
      hasSubmenu: true,
      color: 'text-orange-600',
      franchiseAdminOnly: true, // Only visible to franchise_admin users
      submenu: [
        { title: 'Manage Branches', path: '/admin/branches', icon: FaBuilding },
        { title: 'Manage Users', path: '/Branch/ManageUsers', icon: FaUserTie },
        { title: 'Branch Wallet', path: '/Branch/Wallet', icon: FaUserCircle }
      ]
    },
    // Staff/Emp for franchise_admin
    {
      key: 'staff-emp',
      title: 'Staff/Emp',
      icon: FaUserTie,
      hasSubmenu: true,
      color: 'text-orange-600',
      franchiseAdminOnly: true, // Only visible to franchise_admin
      submenu: [
        { title: 'Employee Department', path: '/branch/staff/departments', icon: FaBuilding },
        { title: 'Manage Staff', path: '/branch/staff/manage', icon: FaUsers },
        { title: 'Advance Report', path: '/branch/staff/advance-report', icon: FaFileInvoice },
        { title: 'Generate Salary', path: '/branch/staff/salary', icon: FaDollarSign }
      ]
    },
    // Instructors for branch_admin
    {
      key: 'instructor',
      title: 'Instructors',
      icon: FaUserTie,
      hasSubmenu: true,
      color: 'text-orange-600',
      branchAdminOnly: true, // Only visible to branch_admin
      submenu: [
        { title: 'Instructor Department', path: '/branch/instructors/departments', icon: FaBuilding },
        { title: 'Manage Instructors', path: '/branch/instructors/manage', icon: FaUsers },
        { title: 'Advance Report', path: '/branch/instructors/advance-report', icon: FaFileInvoice },
        { title: 'Generate Salary', path: '/branch/instructors/salary', icon: FaDollarSign }
      ]
    },
    {
      key: 'student',
      title: 'Student',
      icon: FaUserGraduate,
      hasSubmenu: true,
      color: 'text-amber-500',
      submenu: [
        {
          title: 'Manage Students',
          path: null, // Will be dynamically set based on role
          icon: FaUsers,
          roleBasedPath: true // Flag to indicate this path is role-based
        },
        {
          title: 'ID Card',
          path: null, // Will be dynamically set based on role
          icon: FaIdCard,
          roleBasedPath: true // Flag to indicate this path is role-based
        },

      ]
    },
    {
      key: 'courses',
      title: 'Courses',
      icon: FaBook,
      hasSubmenu: true,
      color: 'text-amber-600',
      submenu: [
        {
          title: 'Program',
          path: null, // Will be dynamically set based on role
          icon: FaBook,
          roleBasedPath: true // Flag to indicate this path is role-based
        },
        {
          title: 'Courses',
          path: null, // Will be dynamically set based on role
          icon: FaBookOpen,
          roleBasedPath: true // Flag to indicate this path is role-based
        },
        {
          title: 'Subject',
          path: null, // Will be dynamically set based on role
          icon: FaClipboard,
          roleBasedPath: true // Flag to indicate this path is role-based
        },
        {
          title: 'Batch',
          path: null, // Will be dynamically set based on role
          icon: FaUsers,
          roleBasedPath: true // Flag to indicate this path is role-based
        }
      ]
    },
    {
      key: 'study-materials',
      title: 'Study Materials',
      icon: FaBookOpen,
      hasSubmenu: true,
      color: 'text-amber-600',
      submenu: [
        { title: 'Syllabus', path: '/branch/study-materials/syllabus', icon: FaClipboardList, roleBasedPath: true },
        { title: 'Study Materials', path: '/branch/study-materials/materials', icon: FaBookOpen, roleBasedPath: true },
        { title: 'Video Classes', path: '/branch/study-materials/videos', icon: FaVideo, roleBasedPath: true }
      ]
    },
    {
      key: 'online-exam',
      title: 'Online Exam',
      icon: FaClipboardCheck,
      hasSubmenu: true,
      color: 'text-orange-600',
      submenu: [
        { title: 'Paper Set', path: '/branch/exams/paper-sets', icon: FaClipboard, roleBasedPath: true },
        { title: 'Question', path: '/branch/exams/questions', icon: FaQuestion, roleBasedPath: true },
        { title: 'Result', path: '/branch/exams/results', icon: FaTrophy, roleBasedPath: true }
      ]
    },
    {
      key: 'marksheet-certificate',
      title: 'Marksheet / Certificate',
      icon: FaCertificate,
      path: null, // Will be dynamically set based on role
      color: 'text-yellow-600',
      roleBasedPath: true
    },
    {
      key: 'incomes',
      title: 'Incomes',
      icon: FaDollarSign,
      hasSubmenu: true,
      color: 'text-amber-500',
      submenu: [
        { title: 'Income Head', path: '/branch/incomes/heads', icon: FaCog, roleBasedPath: true },
        { title: 'Income Report', path: '/branch/incomes/report', icon: FaChartBar, roleBasedPath: true }
      ]
    },
    {
      key: 'expenses',
      title: 'Expenses',
      icon: FaReceipt,
      hasSubmenu: true,
      color: 'text-orange-500',
      submenu: [
        { title: 'Manage Heads', path: '/branch/expenses/heads', icon: FaCog, roleBasedPath: true },
        { title: 'Expense Report', path: '/branch/expenses/report', icon: FaChartBar, roleBasedPath: true }
      ]
    }
  ];

  // Filter navigation items based on user role
  const getFilteredNavigationItems = () => {
    return navigationItems.filter(item => {
      // If item is marked as adminOnly, only show to admin and branch_admin users
      if (item.adminOnly) {
        return userRole === 'admin' || userRole === 'branch_admin';
      }
      // If item is marked as branchAdminOnly, only show to branch_admin users
      if (item.branchAdminOnly) {
        return userRole === 'branch_admin';
      }
      // If item is marked as franchiseAdminOnly, only show to franchise_admin users
      if (item.franchiseAdminOnly) {
        return userRole === 'franchise_admin' || userRole === 'admin';
      }
      // Show all other items to both admin and branch users
      return true;
    });
  };

  const filteredNavigationItems = getFilteredNavigationItems();

  // Check if sidebar should show full content
  const showFullContent = !isCollapsed || isHovering;

  return (
    <div className="h-full bg-white shadow-lg flex flex-col">
      {/* User Profile Section */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <FaUserCircle className="text-2xl" />
          </div>
          {showFullContent && (
            <div className="overflow-hidden">
              <h3 className="font-semibold text-lg whitespace-nowrap">{userName}</h3>
              {userRole && (
                <p className="text-xs text-amber-100 whitespace-nowrap">
                  {userRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Header */}
      {showFullContent && (
        <div className="px-4 py-3 border-b border-gray-200">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            USER NAVIGATION
          </h4>
        </div>
      )}

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto">
        <nav className="px-2 py-2 space-y-1">
          {filteredNavigationItems.map((item) => (
            <div key={item.key}>
              {/* Main Navigation Item */}
              <div
                className={`
                  flex items-center justify-between w-full px-3 py-3 text-left text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer group
                  ${isActive(item.path)
                    ? 'bg-amber-100 text-amber-700 shadow-sm hover:bg-amber-200 hover:text-amber-800'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                  ${isCollapsed && !isHovering ? 'justify-center px-2' : ''}
                `}
                onClick={() => {
                  if (item.hasSubmenu) {
                    toggleExpanded(item.key);
                  } else {
                    handleNavigation(item.path, item);
                    if (onItemClick) onItemClick();
                  }
                }}
                title={isCollapsed && !isHovering ? item.title : ''}
              >
                <div className={`flex items-center ${isCollapsed && !isHovering ? 'justify-center' : 'space-x-3'}`}>
                  <item.icon className={`text-lg ${item.color} flex-shrink-0`} />
                  {showFullContent && (
                    <span className="font-medium whitespace-nowrap overflow-hidden">{item.title}</span>
                  )}
                </div>

                {item.hasSubmenu && showFullContent && (
                  <div className="text-gray-400 group-hover:text-gray-600 flex-shrink-0">
                    {expandedItems[item.key] ? (
                      <FaChevronUp className="text-xs" />
                    ) : (
                      <FaChevronDown className="text-xs" />
                    )}
                  </div>
                )}
              </div>

              {/* Submenu Items - Only show when not collapsed or when hovering */}
              {item.hasSubmenu && expandedItems[item.key] && showFullContent && (
                <div className="ml-6 mt-1 space-y-1 animate-fadeIn">
                  {item.submenu.map((subItem, index) => {
                    // Get the correct path for role-based items
                    const getSubItemPath = () => {
                      if (subItem.roleBasedPath) {
                        const currentRole = userRole;

                        // Handle Manage Students
                        if (subItem.title === 'Manage Students') {
                          if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                            return '/Branch/ManageStudents';
                          } else if (currentRole === 'branch' || currentRole === 'branch_admin') {
                            return '/branch/students/registration';
                          } else {
                            return '/branch/students/registration';
                          }
                        }

                        // Handle ID Card
                        if (subItem.title === 'ID Card') {
                          if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                            return '/admin/students/id-cards';
                          } else {
                            return '/branch/students/id-cards';
                          }
                        }

                        // Handle Courses sub tabs
                        if (subItem.title === 'Program') {
                          if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                            return '/admin/courses/programs';
                          } else {
                            return '/branch/courses/programs';
                          }
                        }

                        if (subItem.title === 'Courses') {
                          if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                            return '/admin/courses/manage';
                          } else {
                            return '/branch/courses/courses';
                          }
                        }

                        if (subItem.title === 'Subject') {
                          if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                            return '/admin/courses/subjects';
                          } else {
                            return '/branch/courses/subjects';
                          }
                        }

                        if (subItem.title === 'Batch') {
                          if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                            return '/admin/courses/batches';
                          } else {
                            return '/branch/courses/batches';
                          }
                        }

                        // Handle Study Materials sub tabs
                        if (subItem.title === 'Syllabus') {
                          if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                            return '/branch/study-materials/admin-syllabus';
                          } else {
                            return '/branch/study-materials/syllabus';
                          }
                        }

                        if (subItem.title === 'Study Materials') {
                          if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                            return '/branch/study-materials/admin-materials';
                          } else {
                            return '/branch/study-materials/materials';
                          }
                        }

                        if (subItem.title === 'Video Classes') {
                          if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                            return '/branch/study-materials/admin-videos';
                          } else {
                            return '/branch/study-materials/videos';
                          }
                        }

                        // Handle Online Exam sub tabs
                        if (subItem.title === 'Paper Set') {
                          if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                            return '/branch/exams/admin-paper-sets';
                          } else {
                            return '/branch/exams/paper-sets';
                          }
                        }

                        if (subItem.title === 'Question') {
                          if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                            return '/branch/exams/admin-questions';
                          } else {
                            return '/branch/exams/questions';
                          }
                        }

                        if (subItem.title === 'Result') {
                          if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                            return '/branch/exams/admin-results';
                          } else {
                            return '/branch/exams/results';
                          }
                        }

                        // Handle Income tabs
                        if (subItem.title === 'Income Head') {
                          if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                            return '/admin/incomes/heads';
                          } else {
                            return '/branch/incomes/heads';
                          }
                        }

                        if (subItem.title === 'Income Report') {
                          if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                            return '/admin/incomes/report';
                          } else {
                            return '/branch/incomes/report';
                          }
                        }

                        // Handle Expenses tabs
                        if (subItem.title === 'Manage Heads') {
                          if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                            return '/admin/expenses/heads';
                          } else {
                            return '/branch/expenses/heads';
                          }
                        }

                        if (subItem.title === 'Expense Report') {
                          if (currentRole === 'admin' || currentRole === 'franchise_admin') {
                            return '/admin/expenses/report';
                          } else {
                            return '/branch/expenses/report';
                          }
                        }
                      }

                      return subItem.path;
                    };

                    const actualPath = getSubItemPath();

                    return (
                      <div
                        key={index}
                        className={`
                          flex items-center space-x-3 px-3 py-2 text-sm rounded-lg cursor-pointer transition-all duration-200
                          ${isActive(actualPath)
                            ? 'bg-amber-50 text-amber-600 border-l-4 border-amber-500 hover:bg-amber-200 hover:text-amber-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 border-l-4 border-transparent'
                          }
                        `}
                        onClick={() => {
                          handleNavigation(subItem.path, subItem);
                          if (onItemClick) onItemClick();
                        }}
                      >
                        <subItem.icon className="text-sm text-gray-400" />
                        <span>{subItem.title}</span>
                        {subItem.roleBasedPath && (
                          <span className="text-xs text-gray-400 ml-auto">
                            {(userRole === 'admin' || userRole === 'franchise_admin') ? '(Franchise)' : '(Branch)'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default BranchSidebar;