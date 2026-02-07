import { motion } from "framer-motion";
import { Award, BookOpenCheck, Briefcase, Building, Globe2, Network, Users } from "lucide-react";
import {
  FaArrowRight, FaAward, FaBookOpen, FaBriefcase, FaBuilding, FaDownload,
  FaEye, FaGlobe, FaGraduationCap, FaHandshake, FaLightbulb, FaNetworkWired, FaPlus, FaRocket, FaStar, FaTrophy, FaUserPlus, FaUsers
} from "react-icons/fa";
import { useState } from 'react';
import ConnectWithUsModal from '../components/ConnectWithUsModal';

const Collaboration = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white relative overflow-hidden">
      <ConnectWithUsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      {/* Hero Section - Modern Design */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Modern Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1887&q=80')`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/90"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 via-yellow-500/15 to-orange-600/20"></div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-yellow-500/15 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-32 left-16 w-40 h-40 bg-gradient-to-tr from-orange-400/15 to-amber-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/3 left-1/4 w-24 h-24 bg-gradient-to-br from-yellow-300/10 to-amber-400/15 rounded-full blur-xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Main Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            {/* Badge */}
            <div className="inline-flex items-center bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 rounded-full px-6 py-3">
              <FaGlobe className="text-amber-400 mr-2" />
              <span className="text-amber-300 font-medium">Global Educational Partnerships</span>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight">
              <span className="text-white drop-shadow-2xl">Collaboration</span>
              <br />
              <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent drop-shadow-lg">
                Excellence
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed drop-shadow-lg">
              Building bridges through global expertise and transformative educational partnerships.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <button
                onClick={() => window.location.href = '/partnerships'}
                className="bg-gradient-to-r from-amber-600 to-yellow-500 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:from-amber-700 hover:to-yellow-600 transition-all duration-300 flex items-center gap-2"
              >
                <FaHandshake className="mr-2" />
                Explore Partnerships
              </button>
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(245, 158, 11, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                className="group px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold rounded-2xl transition-all shadow-2xl flex items-center justify-center"
                onClick={() => setModalOpen(true)}
              >
                <FaHandshake className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                Contact Us Today
              </motion.button>
            </div>

            {/* Stats */}
            {/* <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12"
            >
              {[
                { icon: FaGlobe, number: "50+", label: "Global Partners" },
                { icon: FaUsers, number: "15+", label: "Years Experience" },
                { icon: FaGraduationCap, number: "100K+", label: "Students Impacted" },
                { icon: FaTrophy, number: "95%", label: "Success Rate" }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                  className="text-center group"
                >
                  <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/20 transition-all duration-300">
                    <stat.icon className="text-xl text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.number}</div>
                  <div className="text-sm text-gray-300 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div> */}
          </motion.div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 relative">
        {/* Decorative Background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-br from-amber-200/20 to-yellow-200/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-tr from-orange-200/15 to-amber-200/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-br from-yellow-200/10 to-amber-200/15 rounded-full blur-2xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center bg-amber-100 text-amber-700 rounded-full px-6 py-3 text-sm font-medium mb-6">
              <FaRocket className="mr-2" />
              Partnership Excellence
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              <span className="text-slate-800">Transform Through</span>
              <br />
              <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                Strategic Alliances
              </span>
            </h2>
          </motion.div>

          {/* Content Sections */}
          <div className="space-y-32">
            {/* Global Collaboration */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="grid lg:grid-cols-2 gap-16 items-center"
            >
              {/* Image Section */}
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80"
                    alt="Global Collaboration"
                    className="rounded-3xl shadow-2xl w-full h-[500px] object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-3xl"></div>
                  
                  {/* Floating Icon */}
                  <div className="absolute top-6 left-6 w-16 h-16 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl">
                    <FaGlobe className="text-2xl text-amber-600" />
                  </div>
                  
                  {/* Bottom Badge */}
                  <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-white/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center">
                        <FaGlobe className="text-white text-lg" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">Global Reach</h3>
                        <p className="text-slate-600">Connecting minds worldwide</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
                    Global 
                    <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                      {" "}Collaboration
                    </span>
                  </h3>
                  <div className="w-24 h-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full mb-8"></div>
                  <p className="text-xl text-slate-600 leading-relaxed">
                    SWE thrives on partnerships. We work with schools, universities, and training organizations worldwide to deliver programs in communication, pedagogy, leadership, and professional development. These collaborations empower organizations to raise their academic and professional standards to global benchmarks.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 group">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <FaBuilding className="text-white" />
                    </div>
                    <h4 className="font-bold text-slate-800 mb-2">Educational Organizations</h4>
                    <p className="text-slate-600 text-sm">Worldwide partnerships with leading institutions</p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 group">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <FaBookOpen className="text-white" />
                    </div>
                    <h4 className="font-bold text-slate-800 mb-2">Curriculum Standards</h4>
                    <p className="text-slate-600 text-sm">Development and implementation excellence</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Strategic Partnerships */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="grid lg:grid-cols-2 gap-16 items-center"
            >
              {/* Content */}
              <div className="order-2 lg:order-1 space-y-8">
                <div>
                  <h3 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
                    Strategic
                    <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                      {" "}Partnerships
                    </span>
                  </h3>
                  <div className="w-24 h-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full mb-8"></div>
                  <p className="text-xl text-slate-600 leading-relaxed">
                    A partnership with SWE means unlocking global recognition. We provide organizations and corporations with the platform to strengthen their credibility, extend their reach, and achieve international impact. Whether through joint programs, faculty exchange, or bespoke training solutions, SWE takes your institution or business to the next level.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 group">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <FaAward className="text-white" />
                    </div>
                    <h4 className="font-bold text-slate-800 mb-2">International Accreditation</h4>
                    <p className="text-slate-600 text-sm">Global recognition and certification</p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 group">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <FaUserPlus className="text-white" />
                    </div>
                    <h4 className="font-bold text-slate-800 mb-2">Faculty Exchange</h4>
                    <p className="text-slate-600 text-sm">Cross-cultural educational programs</p>
                  </div>
                </div>
              </div>

              {/* Image Section */}
              <div className="order-1 lg:order-2 relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80"
                    alt="Strategic Partnerships"
                    className="rounded-3xl shadow-2xl w-full h-[500px] object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-3xl"></div>
                  
                  {/* Floating Icon */}
                  <div className="absolute top-6 right-6 w-16 h-16 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl">
                    <FaHandshake className="text-2xl text-purple-600" />
                  </div>
                  
                  {/* Bottom Badge */}
                  <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-white/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                        <FaHandshake className="text-white text-lg" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">Strategic Alliance</h3>
                        <p className="text-slate-600">Building tomorrow together</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Why Choose SWE Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative mt-32"
          >
            {/* Background Image */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80"
                alt="Why Choose SWE"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95"></div>
            </div>

            <div className="relative z-10 py-24 px-8">
              {/* Header */}
              <div className="text-center mb-16">
                <div className="inline-flex items-center bg-amber-500/20 text-amber-300 rounded-full px-6 py-3 text-sm font-medium mb-6 border border-amber-500/30">
                  <FaStar className="mr-2" />
                  Excellence Redefined
                </div>
                <h3 className="text-4xl md:text-6xl font-bold mb-6">
                  <span className="text-white">Why Choose</span>
                  <br />
                  <span className="bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                    SWE for Collaboration?
                  </span>
                </h3>
                <div className="w-32 h-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 mx-auto mb-8"></div>
                <p className="text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed">
                  Our commitment to academic excellence and innovative learning approaches sets us apart in the global education landscape.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {/* British Academic Heritage */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <div className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20 hover:bg-white/15 transition-all duration-500 h-full">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-2xl">
                      <FaGraduationCap className="text-3xl text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-4 text-center">British Academic Heritage</h4>
                    <p className="text-slate-300 text-center leading-relaxed">
                      Upholding the prestige of the UK's education legacy with time-tested standards and methodologies.
                    </p>
                  </div>
                </motion.div>

                {/* Dual Learning Modes */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <div className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20 hover:bg-white/15 transition-all duration-500 h-full">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-2xl">
                      <FaBookOpen className="text-3xl text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-4 text-center">Dual Learning Modes</h4>
                    <p className="text-slate-300 text-center leading-relaxed">
                      Online access for global learners + offline onsite training for organizations and corporations.
                    </p>
                  </div>
                </motion.div>

                {/* Global Educator Network */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <div className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20 hover:bg-white/15 transition-all duration-500 h-full">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-2xl">
                      <FaNetworkWired className="text-3xl text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-4 text-center">Global Educator Network</h4>
                    <p className="text-slate-300 text-center leading-relaxed">
                      Learn from expert instructors worldwide with diverse experiences and specialized knowledge.
                    </p>
                  </div>
                </motion.div>

                {/* Creative & Research-Based Pedagogy */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <div className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20 hover:bg-white/15 transition-all duration-500 h-full">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-2xl">
                      <FaLightbulb className="text-3xl text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-4 text-center">Creative & Research-Based Pedagogy</h4>
                    <p className="text-slate-300 text-center leading-relaxed">
                      Encouraging innovation and critical thinking through proven educational methodologies.
                    </p>
                  </div>
                </motion.div>

                {/* Comprehensive Mentorship */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <div className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20 hover:bg-white/15 transition-all duration-500 h-full">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-2xl">
                      <FaUsers className="text-3xl text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-4 text-center">Comprehensive Mentorship</h4>
                    <p className="text-slate-300 text-center leading-relaxed">
                      Guidance that extends beyond academics to real-world success and professional growth.
                    </p>
                  </div>
                </motion.div>

                {/* Industry Connections */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <div className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20 hover:bg-white/15 transition-all duration-500 h-full">
                    <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-2xl">
                      <FaBriefcase className="text-3xl text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-white mb-4 text-center">Industry Connections</h4>
                    <p className="text-slate-300 text-center leading-relaxed">
                      Direct pathways to professional opportunities through our global network of industry partners.
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Bottom Stats */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                viewport={{ once: true }}
                className="grid md:grid-cols-4 gap-8 mt-20 max-w-5xl mx-auto"
              >
                <div className="text-center">
                  <div className="text-5xl font-bold text-amber-400 mb-2">500+</div>
                  <div className="text-slate-300 text-lg">Global Partners</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-amber-400 mb-2">50+</div>
                  <div className="text-slate-300 text-lg">Countries</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-amber-400 mb-2">100K+</div>
                  <div className="text-slate-300 text-lg">Students Impacted</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-amber-400 mb-2">25+</div>
                  <div className="text-slate-300 text-lg">Years Experience</div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Partner Logos Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mt-32"
          >
            <div className="text-center mb-16">
              <div className="inline-flex items-center bg-slate-100 text-slate-600 rounded-full px-6 py-3 text-sm font-medium mb-6">
                <FaHandshake className="mr-2" />
                Trusted Partnerships
              </div>
              <h3 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
                Our <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">Valued Partners</span>
              </h3>
              <div className="w-24 h-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 mx-auto mb-8"></div>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Collaborating with industry leaders to deliver exceptional educational experiences worldwide.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {[
                { name: 'Mahindra', logo: 'mahindra.jpg' },
                { name: 'Tata', logo: 'tata.jpg' },
                { name: 'Sharekhan', logo: 'sharekhan.jpg' },
                { name: 'Wipro', logo: 'wipro.jpg' }
              ].map((partner, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group relative"
                >
                  <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                  <div className="relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200 group-hover:border-amber-200">
                    <div className="relative overflow-hidden rounded-xl">
                      <img 
                        src={`/${partner.logo}`} 
                        alt={`${partner.name} Logo`} 
                        className="h-20 w-full object-contain mx-auto grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110" 
                      />
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-slate-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {partner.name}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Additional Partners Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
              className="text-center mt-12"
            >
              <div className="inline-flex items-center bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-full px-8 py-4 font-semibold shadow-lg">
                <FaPlus className="mr-3" />
                500+ Global Partners
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="relative py-32 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2084&q=80"
            alt="Partnership CTA"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-amber-900/90"></div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-10 right-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Content */}
              <div className="space-y-8">
                <div className="inline-flex items-center bg-amber-500/20 text-amber-300 rounded-full px-6 py-3 text-sm font-medium border border-amber-500/30">
                  <FaRocket className="mr-2" />
                  Transform Your Future
                </div>
                
                <h3 className="text-5xl md:text-6xl font-bold leading-tight">
                  <span className="text-white">Ready to Partner</span>
                  <br />
                  <span className="bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
                    with SWE?
                  </span>
                </h3>
                
                <div className="w-32 h-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full"></div>
                
                <p className="text-xl text-slate-300 leading-relaxed max-w-2xl">
                  Explore how a collaboration with SWE can elevate your institution or organization to global standards. Join our network of distinguished academic and industry partners worldwide.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-6">
                  <motion.button 
                    whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(245, 158, 11, 0.3)" }}
                    whileTap={{ scale: 0.95 }}
                    className="group px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold rounded-2xl transition-all shadow-2xl flex items-center justify-center"
                    onClick={() => setModalOpen(true)}
                  >
                    <FaHandshake className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                    Contact Us Today
                  </motion.button>
                </div>

                {/* Trust Indicators */}
                <div className="flex items-center gap-8 pt-8 border-t border-white/20">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-amber-400">500+</div>
                    <div className="text-slate-400 text-sm">Global Partners</div>
                  </div>
                  <div className="w-px h-12 bg-white/20"></div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-amber-400">25+</div>
                    <div className="text-slate-400 text-sm">Years Experience</div>
                  </div>
                  <div className="w-px h-12 bg-white/20"></div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-amber-400">50+</div>
                    <div className="text-slate-400 text-sm">Countries</div>
                  </div>
                </div>
              </div>

              {/* Image Section */}
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/30 to-yellow-500/30 rounded-3xl blur-2xl"></div>
                <div className="relative">
                  <img 
                    src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                    alt="Partnership Success" 
                    className="rounded-3xl shadow-2xl w-full h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-3xl"></div>
                  
                  {/* Floating Elements */}
                  <div className="absolute top-6 left-6 w-16 h-16 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl">
                    <FaAward className="text-2xl text-amber-600" />
                  </div>
                  
                  <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-white/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xl font-bold text-slate-800">Global Excellence</h4>
                        <p className="text-slate-600">Building partnerships that matter</p>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center">
                        <FaStar className="text-white text-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </motion.div>
          </div>
          
          {/* Training Modal Section */}
          {/* <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative mt-32"
          >
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80"
                alt="Why Choose SWE"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95"></div>
            </div>

            <div className="relative z-10 py-24 px-8">
              <div className="text-center mb-16">
                <div className="inline-flex items-center bg-amber-500/20 text-amber-300 rounded-full px-6 py-3 text-sm font-medium mb-6 border border-amber-500/30">
                  <FaStar className="mr-2" />
                  Excellence Redefined
                </div>
                <h3 className="text-4xl md:text-6xl font-bold mb-6">
                  <span className="text-white">Our Training Approach</span>
                </h3>
                <div className="w-32 h-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 mx-auto mb-8"></div>
                <p className="text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed">
                  Experience transformative learning with SWE's premium training programs, designed to elevate educational standards globally.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {/* Training Approach Cards - Enhanced Design */}
                {/* <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20 hover:bg-white/15 transition-all duration-500 group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <FaGraduationCap className="text-3xl text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2 text-center">Expert Instructors</h4>
                  <p className="text-slate-300 text-center leading-relaxed">
                    Learn from distinguished faculty with global experience and a commitment to excellence in education.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20 hover:bg-white/15 transition-all duration-500 group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <FaBookOpen className="text-3xl text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2 text-center">Comprehensive Curriculum</h4>
                  <p className="text-slate-300 text-center leading-relaxed">
                    Our curriculum is continuously updated to meet international standards and industry needs, ensuring relevance and rigor.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20 hover:bg-white/15 transition-all duration-500 group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <FaNetworkWired className="text-3xl text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2 text-center">Global Networking</h4>
                  <p className="text-slate-300 text-center leading-relaxed">
                    Join a global community of learners and professionals, expanding your horizons and opportunities.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  viewport={{ once: true }}
                  className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20 hover:bg-white/15 transition-all duration-500 group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <FaLightbulb className="text-3xl text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2 text-center">Innovative Pedagogy</h4>
                  <p className="text-slate-300 text-center leading-relaxed">
                    Experience cutting-edge teaching methods that foster critical thinking, creativity, and practical skills.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  viewport={{ once: true }}
                  className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20 hover:bg-white/15 transition-all duration-500 group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <FaUsers className="text-3xl text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2 text-center">Mentorship & Support</h4>
                  <p className="text-slate-300 text-center leading-relaxed">
                    Benefit from personalized guidance and support, ensuring your success in every step of your learning journey.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  viewport={{ once: true }}
                  className="bg-white/10 backdrop-blur-sm p-8 rounded-3xl border border-white/20 hover:bg-white/15 transition-all duration-500 group"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <FaBriefcase className="text-3xl text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2 text-center">Career Opportunities</h4>
                  <p className="text-slate-300 text-center leading-relaxed">
                    Explore diverse career pathways and opportunities for professional growth and development.
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Registration Information Section */}
          <section className="py-16 bg-gradient-to-br from-gray-50 to-white border-t border-gray-200">
            <div className="max-w-6xl mx-auto px-6 md:px-16 lg:px-28">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-[#988913] to-[#c5a32e] px-8 py-6">
                  <div className="flex items-center gap-3">
                    <Building className="w-8 h-8 text-white" />
                    <h3 className="text-2xl font-bold text-white">Registered Address</h3>
                  </div>
                </div>
                
                <div className="p-8 md:p-12">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Left Side - Company Details */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-bold text-[#988913] mb-3">Company Information</h4>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="bg-[#988913]/10 p-2 rounded-lg mt-1">
                              <Building className="w-5 h-5 text-[#988913]" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">Skill Wallah EdTech of Management and Communication</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <div className="bg-[#988913]/10 p-2 rounded-lg mt-1">
                              <Globe2 className="w-5 h-5 text-[#988913]" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 font-medium mb-1">Registered Office</p>
                              <p className="text-gray-800">A 43,</p>
                              <p className="text-gray-800">Sector 63,</p>
                              <p className="text-gray-800">Noida,</p>
                              <p className="text-gray-800">Uttar Pradesh, India.</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <div className="bg-[#988913]/10 p-2 rounded-lg mt-1">
                              <Award className="w-5 h-5 text-[#988913]" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 font-medium mb-1">Registration Authority</p>
                              <p className="text-gray-800">Company House, U.K.</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-3">
                            <div className="bg-[#988913]/10 p-2 rounded-lg mt-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#988913]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 font-medium mb-1">Registration Number</p>
                              <p className="text-xl font-bold text-[#988913]">16527556</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Side - Map or Additional Info */}
                    <div className="bg-gradient-to-br from-[#f9f7f1] to-[#f5f1e6] rounded-xl p-8 border border-[#e0d5b3]">
                      <h4 className="text-lg font-bold text-[#988913] mb-4">Accreditation & Recognition</h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded-lg shadow-sm">
                            <Award className="w-5 h-5 text-[#988913]" />
                          </div>
                          <p className="text-gray-700">UK Government Registered</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded-lg shadow-sm">
                            <Globe2 className="w-5 h-5 text-[#988913]" />
                          </div>
                          <p className="text-gray-700">International Recognition</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded-lg shadow-sm">
                            <FaGraduationCap className="w-5 h-5 text-[#988913]" />
                          </div>
                          <p className="text-gray-700">British Academic Heritage</p>
                        </div>
                      </div>
                      
                      {/* <div className="mt-6 pt-6 border-t border-[#d4c99c]">
                        <p className="text-sm text-gray-600 italic">
                          SWE is a legally registered educational institution in the United Kingdom, 
                          committed to maintaining the highest standards of academic excellence and integrity.
                        </p>
                      </div> */}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        
        </section>
    </div>
  )
};

export default Collaboration;
