import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { FaArrowRight, FaGraduationCap, FaPlay, FaStar, FaTrophy, FaUsers } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const HeroSection = () => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleExploreClick = () => {
    navigate('/courses-offer');
  };

  const handleWatchDemo = () => {
    // Add video demo functionality here
    console.log('Play demo video');
  };

  const stats = [
    { icon: FaUsers, number: "50K+", label: "Students" },
    { icon: FaGraduationCap, number: "200+", label: "Courses" },
    { icon: FaTrophy, number: "98%", label: "Success Rate" },
    { icon: FaStar, number: "4.9", label: "Rating" }
  ];

  // Educational images for automatic sliding
  const educationImages = [
    {
      url: "https://i.pinimg.com/originals/ea/30/60/ea30601fa9050e0de59a84adbc00eb22.jpg",
      title: "Team Collaboration",
      description: "Group Learning Sessions"
    },
    {
      url: "https://static.tildacdn.com/tild3962-6565-4262-b336-373963376338/image.png",
      title: "Modern Classroom",
      description: "Interactive Learning Space"
    },
    {
      url: "https://yandex-images.clstorage.net/bnuy99335/e1e9049X0o9S/inZ0jOe4ckzY90PELdpHfqZHSkPF-mowW-ti_Hk0KdP9_ZjVm16DnBO388B_yBbp2McQZKAzF_IGM13O5lerR-tysPiWLcc4-SIDRB2KZqtydluGZb-7lH7bN_lf4l5UqrtaM7mpcSviZ8MFCowXSY0itoIkE3dW9wOfuiEy_VOJJDVvwejQPSwm4uTcurSJRpe5xbc-OcCszvL-7kIvdBkY-ZGLuXHoQMeh9kvs88uNcwTgobIW9nTyPYuR4P8z6gUGn-Gb4V6_ZVPnjVr2uzaH2qdHf4hy326QTI-zTparykgySyoQKYGXIQY6HrPojtBEELMR1_dF027a0nIPQIpk1_7zegCNDgaydc1bB-sUd6tEB68qII6fQl6vIs4mWsiaYop4MCoyhyCl2n2xWv9D9eNyotUVxjA_-uPC3iI7lrd_4WpSXc02o0Y_eOSKhZQLl-UdSAK83gGM_mDtx9u6KaObSbGKUsWwtnjNw9k-8sWCgZG3F8VRHIlQgwwS2-TFz0MYEW0dB4MVb3llWha1SmY2XBrzjq1iry1RLjTIistBuUngyeKkoGf4jIIqnIJFMwDTdZe0IV2qIKOeY6sE9M0i-dDtHSajxd8I5ehmVolUlx36sG2egL7-Y34lOrj6sdo744gSt5K2Wb9jW60hVNKhAjUlt0GvCMJCvHLaVzQOgwnBLH7kIxePakTqxGfrhiQfuYDfnEPu3CLvJBpYmHO5e8MaQeZA9WudcVtN8yZAUyIk9MQh_dtgc75gyEYED1D7wN2NdDE1Xxo2OhXmu4UGP3nRjg4Dv14xHzSrmJtA6fvhSWM3IRX5nvHZX6H1YfBSxyX0IV6q0WPdYqo01p6SSkMtfSSyVm-rNYh25alXhF8aAL1Nor69co9GSsk6Itq5wysQ1aFGyh3B6ZxC9jNAQGWnVwP_eYJwPgOr1TfuQZhhDmxWQ5efqMe75bZppDcd29JeXrJP4",
      title: "Student Success",
      description: "Achievement & Growth"
    },
    {
      url: "https://news.mit.edu/sites/default/files/styles/news_article__image_gallery/public/images/201102/20110204090810-2.jpg?itok=XnKXoEvL",
      title: "Study Environment",
      description: "Focused Learning"
    },
    {
      url: "https://www.brandeis.edu/mathematics/images/applied-math-class.jpg",
      title: "Digital Education",
      description: "Technology Enhanced Learning"
    }
  ];

  // Auto-slide effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === educationImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [educationImages.length]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80')`
        }}
      >
        {/* Multiple Gradient Overlays for Better Content Visibility */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-800/60 to-slate-900/80"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-amber-600/30 via-yellow-500/20 to-orange-600/30"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-amber-400/20 to-orange-400/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-tr from-yellow-400/25 to-amber-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-gradient-to-br from-amber-300/15 to-yellow-300/10 rounded-full blur-2xl animate-pulse delay-500"></div>
        <div className="absolute bottom-1/3 right-1/4 w-36 h-36 bg-gradient-to-br from-orange-400/20 to-red-400/15 rounded-full blur-2xl animate-pulse delay-700"></div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center min-h-[calc(100vh-8rem)]">
          
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            

            {/* Main Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight tracking-tight"
            >
              <span className="text-white drop-shadow-2xl">
                Master Skills,
              </span>
              <br />
              <span className="bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent drop-shadow-2xl">
                Build Career,
              </span>
              <br />
              <span className="text-white drop-shadow-2xl">
                Shape Future.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="text-base md:text-lg lg:text-xl text-gray-200 leading-relaxed max-w-lg font-normal drop-shadow-lg"
            >
              Transform your career with industry-leading courses, world-class mentorship, and hands-on practical learning experiences that prepare you for tomorrow's challenges.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-4 pt-4"
            >
              <button
                onClick={handleExploreClick}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl shadow-2xl hover:shadow-amber-500/40 transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 overflow-hidden border border-amber-400/50"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-amber-600 to-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                <span className="relative flex items-center gap-3 drop-shadow-lg">
                  <FaGraduationCap className="text-lg" />
                  Explore Courses
                  <FaArrowRight className="group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8"
            >
              {stats.map((stat, index) => (
                <motion.div 
                  key={index} 
                  className="text-center group"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300, damping: 10 }}
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl mb-3 shadow-lg group-hover:shadow-xl transition-all duration-300 border border-white/20 group-hover:bg-white/20">
                    <stat.icon className="text-amber-400 text-lg group-hover:scale-110 transition-transform duration-300 drop-shadow-lg" />
                  </div>
                  <div className="text-xl font-bold text-white mb-1 drop-shadow-lg">{stat.number}</div>
                  <div className="text-sm text-gray-200 font-medium drop-shadow-md">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Content - Education Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            {/* Main Hero Image */}
            <div className="relative">
              {/* Background Decorative Element */}
              <div className="absolute -inset-4 bg-gradient-to-r from-amber-400/20 to-yellow-400/25 rounded-3xl blur-2xl"></div>
              <div className="absolute -inset-2 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl blur-xl"></div>
              
              {/* Main Image Container with Auto-sliding */}
              <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
                <div className="aspect-[5/4] relative">
                  {/* Image Slider Container */}
                  <div className="relative w-full h-full overflow-hidden">
                    {educationImages.map((image, index) => (
                      <motion.div
                        key={index}
                        className="absolute inset-0 w-full h-full"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ 
                          opacity: index === currentImageIndex ? 1 : 0,
                          x: index === currentImageIndex ? 0 : 100
                        }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                      >
                        <img 
                          src={image.url}
                          alt={image.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback if image doesn't load
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        {/* Fallback Content */}
                        <div className="hidden w-full h-full items-center justify-center bg-gradient-to-br from-amber-100 to-yellow-100">
                          <div className="text-center space-y-4 p-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl mx-auto flex items-center justify-center shadow-lg">
                              <FaGraduationCap className="text-white text-xl" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-bold text-slate-800">SkillWallah EdTech</h3>
                              <p className="text-sm text-slate-600 font-medium">Excellence in Digital Education</p>
                              <div className="w-12 h-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full mx-auto"></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="bg-white/80 rounded-lg p-3 backdrop-blur-sm border border-amber-200">
                                <div className="font-bold text-amber-700">Expert Faculty</div>
                                <div className="text-slate-600">Industry Leaders</div>
                              </div>
                              <div className="bg-white/80 rounded-lg p-3 backdrop-blur-sm border border-yellow-200">
                                <div className="font-bold text-yellow-700">Live Classes</div>
                                <div className="text-slate-600">Interactive Learning</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Image Dots Indicator */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
                    {educationImages.map((_, index) => (
                      <button
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === currentImageIndex 
                            ? 'bg-amber-500 w-6' 
                            : 'bg-white/60 hover:bg-white/80'
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Dynamic Image Overlay Info */}
                <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2">
                  <motion.div 
                    key={currentImageIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-amber-200/50 w-64"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center">
                          <FaGraduationCap className="text-white text-xs" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">
                            {educationImages[currentImageIndex].title}
                          </div>
                          <div className="text-xs text-slate-600">
                            {educationImages[currentImageIndex].description}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-slate-700 font-medium">Live Now</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>


            </div>
          </motion.div>
        </div>
      </div>



      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-black/30 via-black/10 to-transparent"></div>
    </div>
  );
};

export default HeroSection;
