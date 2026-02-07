import { motion } from 'framer-motion';
import { FaArrowRight, FaGraduationCap } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const WhyChooseUs = () => {
  const navigate = useNavigate();

  const handleExploreClick = () => {
    navigate('/courses-offer');
  };

  return (
    <div className="relative bg-gradient-to-br from-white via-amber-50/30 to-yellow-50/30 py-20 overflow-hidden">
      {/* Background SkillWallah Logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <div className="text-center">
          <div className="text-[20rem] md:text-[25rem] lg:text-[30rem] font-bold text-amber-600 leading-none select-none pointer-events-none">
            SkillWallah
          </div>
          <div className="text-[8rem] md:text-[10rem] lg:text-[12rem] font-bold text-amber-500 leading-none select-none pointer-events-none -mt-16">
            EdTech
          </div>
        </div>
      </div>

      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-tr from-yellow-400/10 to-amber-400/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-br from-amber-300/8 to-yellow-300/8 rounded-full blur-xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 mb-6">
            Why Choose <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">Us?</span>
          </h2>
          <div className="w-32 h-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full mx-auto mb-8"></div>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto font-medium leading-relaxed">
            Discover what makes SkillWallah EdTech London's premier choice for digital education and professional development
          </p>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {/* Card 1 - British Academic Heritage */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="group relative bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-amber-100/50 hover:border-amber-200 hover:-translate-y-3"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/80 to-yellow-50/80 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg group-hover:shadow-xl">
                <span className="text-3xl">🏛️</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4 group-hover:text-amber-700 transition-colors duration-300">
                British Academic Heritage
              </h3>
              <p className="text-slate-600 leading-relaxed mb-6 text-base">
                Experience world-class education rooted in London's prestigious academic traditions and excellence.
              </p>
              <div className="flex items-center text-amber-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                <span className="text-sm">Learn More</span>
                <FaArrowRight className="ml-2 text-xs" />
              </div>
            </div>
          </motion.div>

          {/* Card 2 - Dual Learning Modes */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="group relative bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-blue-100/50 hover:border-blue-200 hover:-translate-y-3"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg group-hover:shadow-xl">
                <span className="text-3xl">🌐</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4 group-hover:text-blue-700 transition-colors duration-300">
                Dual Learning Modes
              </h3>
              <p className="text-slate-600 leading-relaxed mb-6 text-base">
                Flexible online and offline learning options designed to fit your schedule and learning style.
              </p>
              <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                <span className="text-sm">Explore Modes</span>
                <FaArrowRight className="ml-2 text-xs" />
              </div>
            </div>
          </motion.div>

          {/* Card 3 - Global Educator Network */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="group relative bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-orange-100/50 hover:border-orange-200 hover:-translate-y-3"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/80 to-emerald-50/80 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-emerald-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg group-hover:shadow-xl">
                <span className="text-3xl">🏫</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4 group-hover:text-orange-700 transition-colors duration-300">
                Global Educator Network
              </h3>
              <p className="text-slate-600 leading-relaxed mb-6 text-base">
                Learn from industry experts and renowned educators from leading institutions worldwide.
              </p>
              <div className="flex items-center text-orange-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                <span className="text-sm">Meet Faculty</span>
                <FaArrowRight className="ml-2 text-xs" />
              </div>
            </div>
          </motion.div>

          {/* Card 4 - Innovative Pedagogy */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="group relative bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-purple-100/50 hover:border-purple-200 hover:-translate-y-3"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 to-pink-50/80 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg group-hover:shadow-xl">
                <span className="text-3xl">💡</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4 group-hover:text-purple-700 transition-colors duration-300">
                Innovative Pedagogy
              </h3>
              <p className="text-slate-600 leading-relaxed mb-6 text-base">
                Cutting-edge teaching methods combining AI, interactive tools, and personalized learning paths.
              </p>
              <div className="flex items-center text-purple-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                <span className="text-sm">Discover More</span>
                <FaArrowRight className="ml-2 text-xs" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-center"
        >
          <button
            onClick={handleExploreClick}
            className="group inline-flex items-center justify-center px-10 py-5 text-lg font-semibold text-white bg-gradient-to-r from-amber-600 to-yellow-600 rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-amber-500/25 transform hover:-translate-y-1 transition-all duration-300 border border-amber-500/20"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-amber-700 to-yellow-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></span>
            <span className="relative flex items-center gap-3">
              <FaGraduationCap className="text-xl" />
              Start Your Journey Today
              <FaArrowRight className="group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default WhyChooseUs;