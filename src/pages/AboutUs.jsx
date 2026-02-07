import { motion } from "framer-motion";
import { useState } from "react";
import {
  FaArrowRight,
  FaAward,
  FaBolt,
  FaBookOpen,
  FaCog,
  FaGlobe,
  FaGraduationCap,
  FaHandshake,
  FaHeart,
  FaRocket,
  FaStar,
  FaTrophy,
  FaUserGraduate,
  FaUsers
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import ConnectWithUsModal from '../components/ConnectWithUsModal';

const AboutUs = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const downloadBrochure = () => {
    const link = document.createElement('a');
    link.href = '/Skill Wallah EdTech.pdf';
    link.download = 'London-School-of-Management-Communication-Brochure.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white relative overflow-hidden">
    
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-slate-800/60 to-slate-900/80"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 via-yellow-500/15 to-orange-600/20"></div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-yellow-500/15 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-32 left-16 w-40 h-40 bg-gradient-to-tr from-orange-400/15 to-amber-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/3 left-1/4 w-24 h-24 bg-gradient-to-br from-yellow-300/10 to-amber-400/15 rounded-full blur-xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-center mb-16">
            {/* Hero Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 rounded-full px-6 py-3 mb-8"
            >
              <FaGraduationCap className="text-amber-400 mr-2" />
              <span className="text-amber-300 font-medium">Excellence in Education Since Day One</span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 leading-tight"
            >
              <span className="text-white drop-shadow-2xl">
                Welcome to
              </span>
              <br />
              <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent drop-shadow-lg">
                SkillWallah EdTech
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="text-lg md:text-xl text-gray-200 max-w-4xl mx-auto leading-relaxed mb-12 drop-shadow-lg"
            >
              Discover excellence in education with our innovative approach to learning, 
              combining British academic heritage with cutting-edge technology.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 justify-center"
            >
              <button 
                onClick={() => navigate("/courses")}
                className="group bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-bold py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-amber-500/50 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center backdrop-blur-sm"
              >
                <FaBookOpen className="mr-3" />
                Explore Programs
                <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="group bg-white/20 backdrop-blur-sm text-white font-bold py-4 px-8 rounded-2xl border-2 border-white/30 hover:border-white/50 hover:bg-white/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center"
              >
                <FaUsers className="mr-3" />
                Connect With Us
              </button>
            </motion.div>

            {/* Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 max-w-4xl mx-auto"
            >
              {[
                { icon: FaUsers, number: "25K+", label: "Students Worldwide" },
                { icon: FaGlobe, number: "50+", label: "Partner Organizations" },
                { icon: FaTrophy, number: "98%", label: "Success Rate" },
                { icon: FaStar, number: "4.9", label: "Average Rating" }
              ].map((stat, index) => (
                <motion.div 
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  className="text-center group"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20 group-hover:bg-white/20 transition-all duration-300">
                    <stat.icon className="text-amber-400 text-xl" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1 drop-shadow-lg">{stat.number}</div>
                  <div className="text-sm text-gray-300 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* About SWE Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Images Side */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <div className="relative grid grid-cols-2 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 1 }}
                    className="space-y-4"
                  >
                    <img 
                      src="/h3.jpg" 
                      alt="SWE Campus" 
                      className="w-full h-64 object-cover rounded-2xl shadow-xl"
                    />
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-amber-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center">
                          <FaGraduationCap className="text-white text-sm" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">Excellence</div>
                          <div className="text-xs text-slate-600">In Education</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: -1 }}
                    className="space-y-4 mt-8"
                  >
                    <img 
                      src="/h4.jpg" 
                      alt="SWE Students" 
                      className="w-full h-64 object-cover rounded-2xl shadow-xl"
                    />
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-amber-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center">
                          <FaGlobe className="text-white text-sm" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">Global</div>
                          <div className="text-xs text-slate-600">Recognition</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
            
            {/* Content Side */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-8"
            >
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center bg-amber-100 text-amber-700 rounded-full px-4 py-2 text-sm font-medium mb-6"
                >
                  <FaStar className="mr-2" />
                  About SkillWallah EdTech
                </motion.div>

                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent">
                    Empowering Minds.
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                    Shaping Leaders.
                  </span>
                </h2>
                
                <p className="text-xl font-medium text-amber-600 mb-6">
                  London School of Management & Communication
                </p>
              </div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-2xl border border-amber-200 shadow-lg"
              >
                <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center">
                  <FaTrophy className="text-amber-600 mr-2" />
                  Our Mission
                </h3>
                <p className="text-slate-700 leading-relaxed">
                  The Skill Wallah EdTech (SWE) is a globally recognized educational institution headquartered in London. 
                  Rooted in the heritage of British education, we combine classical academic values with cutting-edge 
                  innovations in modern learning.
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <div className="bg-white p-4 rounded-xl shadow-md border border-amber-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center mr-3">
                      <FaUsers className="text-white" />
                    </div>
                    <h4 className="font-bold text-slate-800">For Students</h4>
                  </div>
                  <p className="text-sm text-slate-600">Unlock potential through diverse academic programs</p>
                </div>
                
                <div className="bg-white p-4 rounded-xl shadow-md border border-amber-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center mr-3">
                      <FaBolt className="text-white" />
                    </div>
                    <h4 className="font-bold text-slate-800">For Professionals</h4>
                  </div>
                  <p className="text-sm text-slate-600">Advanced career development programs</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Who We Are Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative z-10 bg-gradient-to-br from-white to-amber-50">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center bg-amber-100 text-amber-700 rounded-full px-6 py-3 text-sm font-medium mb-6">
              <FaBookOpen className="mr-2" />
              Who We Are
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent">
                Transforming Education
              </span>
              <br />
              <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                Worldwide
              </span>
            </h2>
            
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              As an edtech-driven institution, we provide both online and offline learning opportunities, 
              enabling students and professionals across the world to access transformative education.
            </p>
          </motion.div>
          
          {/* Cards Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Description Card */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-3 bg-white rounded-2xl p-8 shadow-xl border border-amber-100"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FaGlobe className="text-white text-2xl" />
                </div>
                <p className="text-lg text-slate-700 leading-relaxed max-w-4xl mx-auto">
                  Our onsite and on-campus training programs extend to schools, colleges, and corporate houses, 
                  ensuring that learning is not limited to classrooms but embedded in real-world environments.
                </p>
              </div>
            </motion.div>

            {/* For Students Card */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-lg border border-blue-200 hover:shadow-xl transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <FaUsers className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors">For Students</h3>
              <p className="text-slate-600">
                Unlock your potential through our diverse range of academic and professional courses designed for future leaders.
              </p>
            </motion.div>

            {/* For Professionals Card */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 shadow-lg border border-emerald-200 hover:shadow-xl transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <FaBolt className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-emerald-600 transition-colors">For Professionals</h3>
              <p className="text-slate-600">
                Advance your career with specialized training and development programs tailored for industry excellence.
              </p>
            </motion.div>

            {/* For Organizations Card */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 shadow-lg border border-purple-200 hover:shadow-xl transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <FaTrophy className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-purple-600 transition-colors">For Organizations</h3>
              <p className="text-slate-600">
                Partner with us to elevate your organization to international standards of excellence and innovation.
              </p>
            </motion.div>
          </div>

          {/* Featured Banner */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FaStar className="text-white text-2xl" />
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-4">Your Gateway to Excellence</h3>
              <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
                Whether you're a student aiming to unlock your potential, a professional seeking career advancement, 
                or an institution striving for international recognition — SWE is your gateway to excellence.
              </p>
              <button className="bg-white/20 backdrop-blur-sm text-white font-bold py-3 px-8 rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-300 flex items-center gap-2 mx-auto">
                <span>Learn More</span>
                <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Distinguished Faculty Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-amber-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-yellow-500/5"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-200 rounded-full blur-3xl opacity-20"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Section Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center bg-amber-100 text-amber-700 rounded-full px-6 py-3 text-sm font-medium mb-6">
              <FaUserGraduate className="mr-2" />
              Distinguished Faculty
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent">
                World-Class
              </span>
              <br />
              <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                Educators
              </span>
            </h2>
            
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Our faculty combines seasoned academicians, global trainers, and industry professionals 
              to deliver exceptional educational experiences.
            </p>
          </motion.div>

          {/* Faculty Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-amber-100 hover:shadow-xl transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <FaBookOpen className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors">
                Seasoned Academicians
              </h3>
              <p className="text-slate-600">
                Professors with extensive teaching experience at prestigious universities worldwide.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-amber-100 hover:shadow-xl transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <FaGlobe className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-emerald-600 transition-colors">
                Global Trainers
              </h3>
              <p className="text-slate-600">
                International experts bringing diverse cultural perspectives and methodologies.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-amber-100 hover:shadow-xl transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <FaCog className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-purple-600 transition-colors">
                Industry Professionals
              </h3>
              <p className="text-slate-600">
                Experts with decades of real-world experience bringing practical insights.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white rounded-2xl p-6 shadow-lg border border-amber-100 hover:shadow-xl transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <FaHandshake className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-amber-600 transition-colors">
                Collaborative Platform
              </h3>
              <p className="text-slate-600">
                Expert educators globally sharing knowledge and diverse perspectives.
              </p>
            </motion.div>
          </div>

          {/* Featured Banner */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="bg-gradient-to-r from-amber-600 to-yellow-600 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FaStar className="text-white text-2xl" />
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-4">Excellence in Education</h3>
              <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
                Our distinguished faculty ensures every student receives world-class education that prepares them 
                for success in their chosen field and beyond.
              </p>
              <button className="bg-white/20 backdrop-blur-sm text-white font-bold py-3 px-8 rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-300 flex items-center gap-2 mx-auto">
                <span>Meet Our Faculty</span>
                <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Choose SWE Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white to-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-200 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-200 rounded-full blur-3xl opacity-20"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Section Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center bg-amber-100 text-amber-700 rounded-full px-6 py-3 text-sm font-medium mb-6">
              <FaStar className="mr-2" />
              Why Choose SWE
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent">
                Excellence in Education,
              </span>
              <br />
              <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                Global Recognition
              </span>
            </h2>
            
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              We combine excellence in education with a focus on practical skills that prepare you 
              for real-world success in today's competitive landscape.
            </p>
          </motion.div>

          {/* Features Grid */}
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-300 group"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <FaHandshake className="text-white text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4 group-hover:text-blue-600 transition-colors">
                Strategic Partnerships
              </h3>
              <p className="text-slate-600 leading-relaxed">
                SWE thrives on partnerships. We work with schools, universities, and training organizations 
                worldwide to deliver programs in communication, pedagogy, leadership, and professional development.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-300 group"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <FaRocket className="text-white text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4 group-hover:text-purple-600 transition-colors">
                Innovation Hub
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Our technology-driven approach to learning embraces digital innovation and interactive teaching 
                methods that prepare students for the rapidly evolving global marketplace.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-300 group"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <FaGlobe className="text-white text-2xl" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4 group-hover:text-emerald-600 transition-colors">
                Global Collaboration
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Through our collaborative edtech platform, we invite expert educators from across the globe 
                to share their knowledge, ensuring diverse perspectives for all learners.
              </p>
            </motion.div>
          </div>

          {/* Stats Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            <div className="text-center p-6 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl text-white transform hover:scale-105 transition-all duration-300 shadow-lg">
              <div className="text-3xl md:text-4xl font-bold mb-2">25+</div>
              <div className="text-sm opacity-90">Years of Excellence</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl text-white transform hover:scale-105 transition-all duration-300 shadow-lg">
              <div className="text-3xl md:text-4xl font-bold mb-2">50+</div>
              <div className="text-sm opacity-90">Partner Organizations</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl text-white transform hover:scale-105 transition-all duration-300 shadow-lg">
              <div className="text-3xl md:text-4xl font-bold mb-2">5K+</div>
              <div className="text-sm opacity-90">Successful Alumni</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl text-white transform hover:scale-105 transition-all duration-300 shadow-lg">
              <div className="text-3xl md:text-4xl font-bold mb-2">98%</div>
              <div className="text-sm opacity-90">Placement Rate</div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Core Values Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-amber-50 to-yellow-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-yellow-500/5"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-200 rounded-full blur-3xl opacity-20"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Section Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center bg-amber-100 text-amber-700 rounded-full px-6 py-3 text-sm font-medium mb-6">
              <FaHeart className="mr-2" />
              Our Core Values
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent">
                Principles That
              </span>
              <br />
              <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                Drive Excellence
              </span>
            </h2>
            
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Our values form the foundation of everything we do, shaping our educational philosophy 
              and guiding our commitment to student success.
            </p>
          </motion.div>

          {/* Values Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-amber-100 hover:shadow-xl transition-all duration-300 group text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <FaHeart className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-4 group-hover:text-red-600 transition-colors">
                Academic Excellence
              </h3>
              <p className="text-slate-600">
                We maintain rigorous academic standards and cultivate intellectual curiosity in our students.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-amber-100 hover:shadow-xl transition-all duration-300 group text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <FaBolt className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-4 group-hover:text-blue-600 transition-colors">
                Character Development
              </h3>
              <p className="text-slate-600">
                We foster integrity, resilience, and ethical leadership in everything we do.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-amber-100 hover:shadow-xl transition-all duration-300 group text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <FaAward className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-4 group-hover:text-emerald-600 transition-colors">
                British Tradition
              </h3>
              <p className="text-slate-600">
                We honor the rich heritage of British education while embracing innovation and modern pedagogies.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-amber-100 hover:shadow-xl transition-all duration-300 group text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <FaGlobe className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-4 group-hover:text-purple-600 transition-colors">
                Global Citizenship
              </h3>
              <p className="text-slate-600">
                We prepare students to thrive in diverse cultural contexts and contribute meaningfully to society.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white to-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-500/5 to-blue-500/5"></div>
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-slate-200 rounded-full blur-3xl opacity-20"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Section Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center bg-amber-100 text-amber-700 rounded-full px-6 py-3 text-sm font-medium mb-6">
              <FaUsers className="mr-2" />
              Our Leadership Team
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent">
                Meet Our
              </span>
              <br />
              <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                Distinguished Leaders
              </span>
            </h2>
            
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Our leadership team combines decades of educational expertise with a passion for 
              innovation and student success.
            </p>
          </motion.div>

          {/* Team Cards Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 group text-center"
            >
              <div className="w-24 h-24 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
                <img src="/h4.jpg" alt="Dr. James Bennett" className="w-full h-full object-cover rounded-full p-1 relative z-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                Dr. James Bennett
              </h3>
              <p className="text-blue-600 font-medium mb-4">Headmaster</p>
              <p className="text-slate-600 text-sm">
                Oxford University graduate with 25 years of experience in British education and a passion for developing future leaders.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 group text-center"
            >
              <div className="w-24 h-24 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"></div>
                <img src="/h5.jpg" alt="Dr. Elizabeth Clarke" className="w-full h-full object-cover rounded-full p-1 relative z-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-purple-600 transition-colors">
                Dr. Elizabeth Clarke
              </h3>
              <p className="text-purple-600 font-medium mb-4">Academic Director</p>
              <p className="text-slate-600 text-sm">
                Cambridge-educated scholar specializing in curriculum development and educational psychology.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 group text-center"
            >
              <div className="w-24 h-24 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"></div>
                <img src="/h6.jpg" alt="Mr. Rajiv Patel" className="w-full h-full object-cover rounded-full p-1 relative z-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">
                Mr. Rajiv Patel
              </h3>
              <p className="text-emerald-600 font-medium mb-4">International Relations</p>
              <p className="text-slate-600 text-sm">
                Global education expert who oversees our international programs and university placement services.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-r from-amber-600 to-yellow-600 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FaRocket className="text-white text-2xl" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Begin Your Educational Journey With SWE
              </h2>
              <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
                Join Skill Wallah EdTech and transform your future with our innovative approach to education. 
                Your success story begins here.
              </p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-white/20 backdrop-blur-sm text-white font-bold py-3 px-8 rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-300 flex items-center gap-2 mx-auto"
              >
                <span>Apply Now</span>
                <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Connect With Us Modal */}
      <ConnectWithUsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default AboutUs;
