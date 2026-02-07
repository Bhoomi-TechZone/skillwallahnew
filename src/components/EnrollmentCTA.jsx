import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

const EnrollmentCTA = () => {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  // Role selection data
  const roles = [
    {
      id: 'student',
      title: 'Student',
      description: 'Access courses, assignments, and learning materials',
      icon: '👨‍🎓',
      loginRoute: '/student-login',
      bgColor: '#355592',
      hoverColor: '#2a4373'
    },
    {
      id: 'franchise_admin',
      title: 'Franchise Admin',
      description: 'Manage your franchise, students, and branch operations',
      icon: '👨‍💼',
      loginRoute: '/admin-login',
      bgColor: '#4a6741',
      hoverColor: '#3d5536'
    }
  ];

  // Handle role selection and navigation (optimized for faster navigation)
  const handleRoleSelection = (role) => {
    // Immediate navigation without waiting for modal close animation
    navigate(role.loginRoute);
    setShowModal(false);
  };

  // Handle modal close
  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className="w-full py-8 sm:py-12 md:py-16" style={{ backgroundColor: '#f0f0f0' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 text-center px-2"
            style={{ color: '#355592' }}
          >
            Enroll with Pride. Learn with Prestige.
          </h2>
          <p 
            className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-center max-w-3xl mx-auto px-2"
            style={{ color: '#355592' }}
          >
            Become part of a legacy of leadership, innovation, and global influence.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 px-2">
            <motion.button
              onClick={() => setShowModal(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-full text-white py-2 sm:py-3 px-6 sm:px-8 md:px-10 text-sm sm:text-base font-medium inline-flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300"
              style={{ backgroundColor: '#355592' }}
            >
              <span className="mr-2 sm:mr-3">Join Now</span>
              <img 
                src="/logosingle.png" 
                alt="Skill Wallah EdTech Logo" 
                className="h-5 w-5 sm:h-6 sm:w-6 object-contain"
              />
            </motion.button>
            
            <Link to="/ContactUs">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-full text-white py-2 sm:py-3 px-6 sm:px-8 md:px-10 text-sm sm:text-base font-medium inline-flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300"
                style={{ backgroundColor: '#355592' }}
              >
                <span className="mr-2 sm:mr-3">Contact Us</span>
                <img 
                  src="/logosingle.png" 
                  alt="Skill Wallah EdTech Logo" 
                  className="h-5 w-5 sm:h-6 sm:w-6 object-contain"
                />
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Role Selection Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200 p-6 sm:p-8 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <h3 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: '#355592' }}>
                  Select Your Role
                </h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  Choose your role to access the appropriate login page
                </p>
              </div>

              <div className="space-y-3">
                {roles.map((role) => (
                  <motion.button
                    key={role.id}
                    onClick={() => handleRoleSelection(role)}
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full p-4 rounded-xl text-white shadow-lg transition-all duration-200 border border-opacity-20 border-white"
                    style={{ 
                      backgroundColor: role.bgColor,
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = role.hoverColor}
                    onMouseLeave={(e) => e.target.style.backgroundColor = role.bgColor}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl bg-white bg-opacity-20 rounded-full w-12 h-12 flex items-center justify-center">
                        {role.icon}
                      </div>
                      <div className="text-left flex-1">
                        <h4 className="text-lg font-semibold mb-1">{role.title}</h4>
                        <p className="text-sm opacity-90 leading-tight">{role.description}</p>
                      </div>
                      <div className="text-white opacity-60">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              <motion.button
                onClick={closeModal}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-6 py-3 px-6 border-2 font-medium rounded-xl transition-all duration-200"
                style={{ 
                  borderColor: '#355592',
                  color: '#355592',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#355592';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#355592';
                }}
              >
                Cancel
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnrollmentCTA;
