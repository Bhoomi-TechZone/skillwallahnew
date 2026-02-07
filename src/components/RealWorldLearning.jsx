import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const RealWorldLearning = () => {
  const navigate = useNavigate();
  return (
    <div className="relative py-16" style={{ 
      backgroundColor: '#f2f2f2', // Light gray background as shown in image
      overflow: 'hidden',
    }}>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row items-center">
          {/* Left side - Image with amberborder */}
          <div className="md:w-1/2 mb-10 md:mb-0 relative">
            <div className="relative">
              {/* amberrectangle behind the image */}
              <div 
                className="absolute" 
                style={{ 
                  backgroundColor: '#2e5288', // Dark ambercolor from image
                  width: '90%',
                  height: '90%',
                  bottom: '-20px',
                  right: '-20px',
                  zIndex: 0
                }}
              ></div>
              
              {/* Image */}
              <motion.img 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                src="/pic7.jpg" // Student image
                alt="Student with books and backpack" 
                className="relative z-10 w-full"
                style={{ maxWidth: '90%' }}
              />
            </div>
          </div>
          
          {/* Right side - Content */}
          <div className="md:w-1/2 md:pl-10">
            <motion.h2 
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-5xl font-bold mb-6 text-[#2e5288]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              REAL-WORLD LEARNING BEYOND CLASSROOMS
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg mb-6 text-gray-800"
            >
              Our onsite and on-campus programs provide personalized training for organizations and organizations:
            </motion.p>
            
            <motion.ul
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-8 text-gray-800"
            >
              <li className="flex items-start mb-3">
                <div className="mr-2 mt-1">•</div>
                <div>Customized workshops tailored to organizational needs.</div>
              </li>
              <li className="flex items-start mb-3">
                <div className="mr-2 mt-1">•</div>
                <div>Expert-led seminars and mentorship bridging theory with practice.</div>
              </li>
              <li className="flex items-start mb-3">
                <div className="mr-2 mt-1">•</div>
                <div>Direct access to global trainers and faculty.</div>
              </li>
            </motion.ul>
            
            <motion.button
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-3 bg-[#2e5288] text-white hover:bg-[#1e3c68] transition duration-300"
              onClick={() => {
                navigate('/courses-offer');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Explore training programs
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealWorldLearning;
