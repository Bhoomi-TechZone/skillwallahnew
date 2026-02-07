import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Star,
  Target, Trophy, Users
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowRight,
  FaGlobe,
  FaGraduationCap,
  FaLightbulb,
  FaRocket,
  FaUsers
} from 'react-icons/fa';
import ConnectWithUsModal from '../components/ConnectWithUsModal';

const Opportunities = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white relative overflow-hidden">
      {/* Modern Hero Section */}
      <section className="relative h-screen min-h-[600px] max-h-[1200px] flex items-center justify-center overflow-hidden">
        {/* Background with Modern Gradient */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80')`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-800/75 to-slate-900/90"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600/25 via-yellow-500/20 to-orange-600/25"></div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-yellow-500/15 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-32 left-16 w-40 h-40 bg-gradient-to-tr from-orange-400/15 to-amber-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/3 left-1/4 w-24 h-24 bg-gradient-to-br from-yellow-300/10 to-amber-400/15 rounded-full blur-xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Hero Badge */}
          {/* <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 rounded-full px-6 py-3 mb-8"
          >
            <FaRocket className="text-amber-400 mr-2 h-5 w-5" />
            <span className="text-amber-300 font-medium">Unlock Your Potential</span>
          </motion.div> */}

          {/* Main Heading */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-2xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6"
          >
            <span className="text-white drop-shadow-2xl block mb-2">
              Knowledge Meets
            </span>
            <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent drop-shadow-lg block">
              Opportunity
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-base md:text-lg text-gray-200 max-w-3xl mx-auto leading-relaxed mb-8 drop-shadow-lg"
          >
            Join SkillWallah EdTech and become part of a legacy of leadership, innovation, and global influence.
          </motion.p>

          {/* Feature Highlight Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="bg-white/10 backdrop-blur-md p-4 md:p-6 rounded-3xl border border-amber-500/20 shadow-2xl max-w-3xl mx-auto mb-10"
          >
            <p className="text-sm md:text-base text-white leading-relaxed">
              Connect with the world, collaborate with experts, and make a lasting global impact.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center mb-16"
          >
            <button
              onClick={() => navigate('/courses')}
              className="group bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-bold py-3 md:py-4 px-6 md:px-8 rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-amber-500/50 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center backdrop-blur-sm"
            >
              <FaGraduationCap className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" />
              <span className="text-sm md:text-base">Explore Programs</span>
              <FaArrowRight className="ml-2 md:ml-3 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="group bg-white/20 backdrop-blur-sm text-white font-bold py-3 md:py-4 px-6 md:px-8 rounded-2xl border-2 border-white/30 hover:border-white/50 hover:bg-white/30 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center"
            >
              <FaUsers className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" />
              <span className="text-sm md:text-base">Connect With Us</span>
            </button>
          </motion.div>

          {/* Stats Section */}
          {/* <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
          >
            {[
              { icon: FaUsers, number: "25K+", label: "Global Students" },
              { icon: FaGlobe, number: "50+", label: "Partner Organizations" },
              { icon: FaTrophy, number: "98%", label: "Success Rate" },
              { icon: FaStar, number: "4.9", label: "Average Rating" }
            ].map((stat, index) => (
              <motion.div 
                key={index}
                whileHover={{ scale: 1.05 }}
                className="text-center group"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-3 md:mb-4 border border-white/20 group-hover:bg-white/20 transition-all duration-300">
                  <stat.icon className="text-amber-400 text-lg md:text-xl" />
                </div>
                <div className="text-lg md:text-2xl font-bold text-white mb-1 drop-shadow-lg">{stat.number}</div>
                <div className="text-xs md:text-sm text-gray-300 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div> */}
        </div>
      </section>

      {/* Modern Philosophy Section */}
      <section className="py-32 bg-gradient-to-br from-white via-slate-50 to-amber-50/30 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-amber-200/20 to-yellow-200/15 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-tr from-orange-200/15 to-amber-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              {/* Section Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="inline-flex items-center bg-gradient-to-r from-amber-500/10 to-yellow-500/10 backdrop-blur-sm border border-amber-500/20 rounded-full px-6 py-3"
              >
                <FaLightbulb className="text-amber-600 mr-2" />
                <span className="text-amber-700 font-semibold">Our Philosophy</span>
              </motion.div>

              {/* Heading */}
              <h2 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-slate-800">Beyond Traditional</span>
                <br />
                <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                  Learning
                </span>
              </h2>

              {/* Description */}
              <p className="text-xl text-slate-600 leading-relaxed">
                At SWE, we believe education should transform lives and create opportunities. Our approach goes 
                beyond textbooks and lectures - we create an ecosystem where knowledge becomes power, 
                connections become catalysts, and learning becomes your pathway to global success.
              </p>

              {/* Features Grid */}
              <div className="space-y-6">
                {[
                  {
                    icon: FaGlobe,
                    title: "Global Perspective & Influence",
                    description: "Develop an international mindset through our globally-focused curriculum"
                  },
                  {
                    icon: FaUsers,
                    title: "Expert Collaboration & Mentorship",
                    description: "Learn directly from industry leaders and experienced professionals"
                  },
                  {
                    icon: FaRocket,
                    title: "Lasting Impact & Leadership", 
                    description: "Develop the skills to lead with confidence and create meaningful change"
                  }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-start space-x-4 group"
                  >
                    <div className="bg-gradient-to-br from-amber-500 to-yellow-600 p-4 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-slate-800 mb-2">{feature.title}</h4>
                      <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Content - Modern Card */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-3xl blur-2xl"></div>
              
              {/* Main Card */}
              <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 rounded-3xl shadow-2xl border border-amber-500/20">
                {/* Floating Badge */}
                <div className="absolute -top-6 -right-6 bg-gradient-to-br from-amber-500 to-yellow-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl">
                  <FaGraduationCap className="h-8 w-8 text-white" />
                </div>

                {/* Content */}
                <div className="space-y-6">
                  <h3 className="text-3xl font-bold text-white">Our Promise</h3>
                  
                  <p className="text-lg text-gray-300 leading-relaxed">
                    When you join SWE, you're not just enrolling in courses - you're investing in a future where 
                    your knowledge translates directly into opportunities. We provide the platform, the connections, 
                    and the expertise you need to make your mark on the world.
                  </p>

                  {/* Quote Box */}
                  <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
                    <div className="flex items-start space-x-3">
                      <div className="bg-amber-500/20 p-2 rounded-lg">
                        <Star className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-amber-300 font-semibold text-lg">
                          "Where Knowledge Meets Opportunity"
                        </p>
                        <p className="text-gray-300 mt-2">
                          More than a motto - it's our commitment to your success
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    {[
                      { number: "98%", label: "Success Rate" },
                      { number: "50+", label: "Partners" },
                      { number: "25K+", label: "Students" }
                    ].map((stat, index) => (
                      <div key={index} className="text-center">
                        <div className="text-2xl font-bold text-amber-400">{stat.number}</div>
                        <div className="text-sm text-gray-400">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute bottom-6 right-6 flex space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-2 w-2 rounded-full bg-amber-400/50"></div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Three Pillars - Modern Design */}
      <section className="py-32 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-tr from-orange-500/5 to-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-yellow-500/5 to-amber-500/10 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="inline-flex items-center bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 rounded-full px-6 py-3 mb-8"
            >
              <Trophy className="text-amber-400 mr-2 h-5 w-5" />
              <span className="text-amber-300 font-medium">What Sets Us Apart</span>
            </motion.div>

            {/* Heading */}
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="text-white">The</span>{' '}
              <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent">
                SWE
              </span>{' '}
              <span className="text-white">Advantage</span>
            </h2>

            {/* Divider */}
            <div className="w-32 h-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 mx-auto mb-8 rounded-full"></div>

            {/* Description */}
            <p className="max-w-3xl mx-auto text-xl text-gray-300 leading-relaxed">
              Our three pillars of excellence create a foundation for your success in the global marketplace
            </p>
          </motion.div>
          
          {/* Three Pillars Cards */}
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: BookOpen,
                title: "Knowledge That Transforms",
                description: "Our curriculum is designed by industry leaders and academic experts to ensure you gain not just theoretical knowledge, but practical skills that drive real-world success.",
                gradient: "from-blue-500 to-purple-600",
                delay: 0.1
              },
              {
                icon: Users,
                title: "Connections That Matter", 
                description: "Build relationships with industry experts, successful alumni, and like-minded peers from around the globe. Your network becomes your net worth.",
                gradient: "from-emerald-500 to-teal-600",
                delay: 0.3
              },
              {
                icon: Target,
                title: "Opportunities That Last",
                description: "Graduate with more than a degree - leave with the confidence, connections, and capabilities to create lasting impact in your chosen field.",
                gradient: "from-amber-500 to-orange-600",
                delay: 0.5
              }
            ].map((pillar, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: pillar.delay }}
                viewport={{ once: true }}
                className="group relative"
              >
                {/* Glow Effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100"></div>
                
                {/* Main Card */}
                <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-8 h-full flex flex-col hover:bg-white/20 transition-all duration-500 group-hover:scale-105">
                  {/* Icon */}
                  <div className="mb-8">
                    <div className={`w-20 h-20 bg-gradient-to-br ${pillar.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                      <pillar.icon className="h-10 w-10 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-4">
                    <h3 className="text-2xl font-bold text-white group-hover:text-amber-300 transition-colors duration-300">
                      {pillar.title}
                    </h3>
                    <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                      {pillar.description}
                    </p>
                  </div>

                  {/* Learn More Link */}
                  <div className="mt-8 pt-6 border-t border-white/10">
                    <span className="inline-flex items-center text-amber-400 font-medium group-hover:text-amber-300 transition-colors cursor-pointer">
                      Learn more 
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-40 transition-opacity">
                    <div className="w-12 h-12 border border-white/30 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section - Improved UI */}
      <section className="py-32 bg-gradient-to-br from-slate-50 via-white to-gray-100 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-amber-200/30 to-yellow-200/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-tr from-orange-200/20 to-amber-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              <span className="text-slate-800">Ready to Transform</span>
              <br />
              <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">Your Future?</span>
            </h2>
            
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
              Join thousands of successful graduates who chose SkillWallah EdTech to unlock their potential and create lasting impact in their careers.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
              <button
                onClick={() => navigate('/courses')}
                className="group bg-gradient-to-r from-amber-600 to-yellow-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-amber-500/50 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center"
              >
                <FaGraduationCap className="mr-3 h-5 w-5" />
                Explore Programs
                <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform h-4 w-4" />
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="group bg-white border-2 border-amber-500 text-amber-600 font-bold py-4 px-8 rounded-2xl hover:bg-amber-50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center"
              >
                <FaUsers className="mr-3 h-5 w-5" />
                Connect With Us
              </button>
            </div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              className="flex flex-wrap justify-center items-center gap-8 pt-12"
            >
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-slate-800">25K+</div>
                <div className="text-slate-600 text-sm">Happy Students</div>
              </div>
              <div className="w-px h-12 bg-slate-300"></div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-slate-800">50+</div>
                <div className="text-slate-600 text-sm">Global Partners</div>
              </div>
              <div className="w-px h-12 bg-slate-300"></div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-slate-800">98%</div>
                <div className="text-slate-600 text-sm">Success Rate</div>
              </div>
              <div className="w-px h-12 bg-slate-300"></div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-slate-800">4.9★</div>
                <div className="text-slate-600 text-sm">Rating</div>
              </div>
            </motion.div>
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

export default Opportunities;