import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const features = [
  {
    title: "Effortless Course Creation & Management",
    icon: "📘",
    description:
      "Create courses based on different completion criteria. Add to course library for self-enrollment or request-based enrollment. Target courses to specific departments or designations.",
  color: "from-black to-gray-700",
  bgGradient: "from-white to-gray-100",
  },
  {
    title: "Upload Course Material in Various Formats",
    icon: "📄",
    description:
      "Upload engaging content like HTML, PDF, videos, documents, image slides, Excel sheets, assignments, assessments, polls, surveys, SCORM, exams, etc.",
    color: "from-black to-gray-700",
    bgGradient: "from-gray-100 to-white",
  },
  {
    title: "Manage Learners & Batches",
    icon: "👥",
    description:
      "Easily manage individual trainees and groups. Register, enroll, and notify via email. Bulk add using CSV import and manage batch enrollments.",
    color: "from-black to-gray-700",
    bgGradient: "from-gray-100 to-white",
  },
  {
    title: "AI Proctored Exams",
    icon: "🛡",
    description:
      "Conduct AI-based webcam proctored exams. Set alert intervals and capture images of unauthorized activities.",
    color: "from-black to-gray-700",
    bgGradient: "from-gray-100 to-white",
  },
  {
    title: "Recommendation Engine",
    icon: "💡",
    description:
      "Recommend courses based on criteria like department, designation, branch, or proficiency using the AI-based recommendation engine.",
    color: "from-black to-gray-700",
    bgGradient: "from-gray-100 to-white",
  },
  {
    title: "Automation",
    icon: "⚙",
    description:
      "Automate enrollments on registration, course completion, or on specific dates/times using rule-based triggers.",
    color: "from-black to-gray-700",
    bgGradient: "from-gray-100 to-white",
  },
];

const Features = ({ showAll, customStyle }) => {
  const navigate = useNavigate();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  // If showAll is true, show all features, else show only first 6
  const featuresToShow = showAll ? features : features.slice(0, 6);
  const compact = customStyle === 'compact';
  
  return (
    <section className={compact 
      ? "w-full py-8 px-2 md:px-4 lg:px-8 bg-gradient-to-br from-white via-gray-100 to-white" 
      : "w-full py-16 px-4 md:px-16 lg:px-24 bg-gradient-to-br from-white via-gray-100 to-white relative overflow-hidden"
    }>
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-40 h-40 bg-gray-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-gray-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute top-1/4 right-1/4 w-60 h-60 bg-gray-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
      
      {!compact && (
        <div className="relative z-10 mb-16">
          <motion.div
            className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-32 h-2 bg-gradient-to-r from-black to-gray-400 rounded-full opacity-70"
            initial={{ width: 0 }}
            whileInView={{ width: 128 }}
            transition={{ duration: 1, delay: 0.2 }}
            viewport={{ once: true }}
          />
          <motion.h2
            className="text-4xl sm:text-5xl md:text-6xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-black to-gray-700 mb-3 drop-shadow-lg tracking-tight"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            Platform Features
          </motion.h2>
          <motion.p 
            className="text-center text-gray-700 max-w-xl mx-auto text-lg opacity-80"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            viewport={{ once: true }}
          >
            Discover the powerful tools and capabilities that make our learning platform stand out
          </motion.p>
        </div>
      )}

      <div className={compact ? "grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3" : "grid gap-8 md:grid-cols-2 lg:grid-cols-3 relative z-10"}>
        {featuresToShow.map((feature, index) => (
          <motion.div
            key={index}
            className={compact
              ? "relative flex flex-col items-center gap-2 text-center bg-white rounded-xl shadow-lg p-4 min-h-[170px] transition-all duration-300 overflow-hidden border border-gray-200"
              : "relative flex flex-col items-start p-6 rounded-2xl shadow-xl transition-all duration-500 overflow-hidden border border-gray-200 bg-white"
            }
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={compact ? { scale: 1.03, boxShadow: "0 8px 30px #98891322" } : { scale: 1.02, y: -5 }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={compact 
              ? { background: "linear-gradient(135deg, #DFDAB6 0%, #DFDAB6 100%)" } 
              : { background: `linear-gradient(135deg, ${hoveredIndex === index ? '#DFDAB6' : '#DFDAB6'} 0%, ${hoveredIndex === index ? '#DFDAB6' : '#DFDAB6'} 100%)` }
            }
          >
            {/* Background gradients */}
            <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-0 transition-opacity duration-300 ${hoveredIndex === index ? 'opacity-100' : ''}`} />
            
            {/* Icon with background glow */}
            <div className="relative z-10 mb-4">
              <span className={`absolute -inset-3 rounded-full bg-gradient-to-br from-gray-300 to-gray-100 opacity-10 blur-lg transform scale-150 transition-transform duration-300 ${hoveredIndex === index ? 'scale-[2]' : ''}`}></span>
              <div className={`relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-black to-gray-700 text-white text-3xl shadow-lg`}>
                {feature.icon}
              </div>
            </div>
            
            {/* Content */}
            <div className="relative z-10 flex flex-col gap-2">
              <h3 className={compact 
                ? "text-base sm:text-lg font-bold text-black" 
                : "text-xl font-bold text-black"
              }>
                {feature.title}
              </h3>
              <p className={compact 
                ? "text-gray-600 text-xs sm:text-sm" 
                : "text-gray-600 text-sm leading-relaxed"
              }>
                {feature.description}
              </p>
            </div>
            
            {/* Decorative corner accent */}
            <div className={`absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl ${feature.color} opacity-10 rounded-tl-full transform transition-all duration-500 ${hoveredIndex === index ? 'scale-110' : 'scale-90'}`}></div>
            {/* Decorative corner accent remains, but uses new color gradient */}
          </motion.div>
        ))}
      </div>

      {!showAll && (
        <motion.div 
          className="flex justify-center mt-16 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <button
            className="group relative px-8 py-3 bg-gradient-to-r from-black to-gray-700 text-white font-semibold rounded-full shadow-lg hover:shadow-gray-400/50 transition-all duration-300 overflow-hidden"
            onClick={() => navigate('/features')}
          >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-gray-700 to-black opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="relative flex items-center gap-2">
              View all features
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </motion.div>
      )}
    </section>
  );
};

export default Features;