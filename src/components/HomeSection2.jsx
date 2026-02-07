import { motion } from "framer-motion";
import { useState } from "react";

const HomeSection2 = () => {
  const [showMore, setShowMore] = useState(false);
  
  const features = [
    "Experience the intuitive interface and easy-to-use course creation tools that support multiple formats. Review performance and gain insight into training impact with reports and dashboards. Gather feedback from learners using the survey tool. Track training completion with extensive reporting. Managers and trainers get access to team progress reports.",
  ];

  const additionalDetails = [
    {
      title: "Course Creation & Management",
      description: "Create engaging courses with multimedia content, interactive quizzes, and assignments. Support for SCORM, video lectures, and downloadable resources."
    },
    {
      title: "Advanced Analytics & Reporting",
      description: "Comprehensive dashboards showing learner progress, completion rates, assessment scores, and detailed analytics to measure training effectiveness."
    },
    {
      title: "User Management & Roles",
      description: "Flexible user management system with role-based access control for administrators, instructors, and learners with customizable permissions."
    },
    {
      title: "Assessment & Certification",
      description: "Create various types of assessments including quizzes, assignments, and final exams. Automatic certificate generation upon course completion."
    },
    {
      title: "Mobile Learning & Accessibility",
      description: "Responsive design ensures seamless learning experience across all devices. Offline content access and progress synchronization available."
    }
  ];

  return (
  <section className="w-full bg-gradient-to-br from-white via-gray-100 to-white py-10 xs:py-12 sm:py-16 px-2 xs:px-4 sm:px-6 md:px-12 lg:px-24 mt-4 xs:mt-6 sm:mt-8">
  <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-8 xs:gap-10 md:gap-12 relative">
  {/* Decorative elements */}
  <div className="absolute -top-20 -left-20 w-40 h-40 bg-gray-200 rounded-full opacity-30 blur-xl"></div>
  <div className="absolute bottom-10 right-10 w-32 h-32 bg-gray-300 rounded-full opacity-20 blur-lg"></div>
  <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-gray-100 rounded-full opacity-20 blur-md"></div>
        
        {/* Left: Image with creative elements */}
        <motion.div
          className="w-full xs:w-10/12 sm:w-4/5 md:w-1/2 flex justify-center relative"
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          <div className="relative">
            {/* Main image with styled container */}
            <div className="relative z-10 bg-gradient-to-br from-gray-400/40 to-gray-200 p-3 rounded-2xl shadow-xl transform rotate-1 hover:rotate-0 transition-all duration-500">
              <img 
                src="l1.jpg" 
                alt="learning" 
                className="rounded-xl shadow-inner object-cover w-full max-w-[340px] xs:max-w-[280px] sm:max-w-[320px] md:max-w-[340px] max-h-[340px] h-auto transform hover:scale-102 transition-all duration-500 border-2 border-gray-300"
              />
              {/* Floating decorative elements */}
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg animate-float">
                <span>🎓</span>
              </div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-black rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg animate-float-delayed">
                <span>📚</span>
              </div>
            </div>
            
            {/* Background pattern elements */}
            <div className="absolute top-1/3 -left-10 w-20 h-20 border-4 border-dashed border-black rounded-lg opacity-60 transform rotate-12 z-0"></div>
            <div className="absolute bottom-10 -right-8 w-16 h-16 border-4 border-dotted border-gray-500 rounded-full opacity-70 z-0"></div>
            
            {/* "Featured" badge */}
            <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-black text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg z-20 border border-gray-300/70">
              AI-Powered Platform
            </div>
          </div>
        </motion.div>

        {/* Right: Text Content with enhanced styling */}
        <motion.div
          className="w-full xs:w-11/12 sm:w-4/5 md:w-1/2 text-center md:text-left relative"
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          {/* Accent line */}
          <div className="hidden md:block absolute -left-8 top-0 bottom-0 w-2 bg-gradient-to-b from-black via-gray-500/70 to-transparent rounded-full"></div>
          <div className="hidden md:block absolute -left-8 top-0 bottom-0 w-2 bg-gradient-to-b from-gray-400 via-gray-300 to-transparent rounded-full"></div>
          
          <h2 className="relative text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black mb-4 xs:mb-6 inline-block">
            <span className="text-black drop-shadow-sm">LEARNING</span> <br className="md:hidden" />
            <span className="text-black drop-shadow-sm">MANAGEMENT</span> <br className="md:hidden" />
            <span className="bg-gradient-to-r from-black to-gray-500 bg-clip-text text-transparent">SYSTEM SIMPLIFIED!</span>
            
            {/* Underline accent */}
            <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-black to-gray-500/60"></div>
            <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-gray-500 to-gray-300"></div>
            
            {/* Corner decorations */}
            <div className="absolute -top-4 -left-4 w-8 h-8 border-t-4 border-l-4 border-black rounded-tl-lg opacity-70"></div>
            <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-4 border-r-4 border-gray-500 rounded-br-lg opacity-70"></div>
          </h2>

          <p className="text-base xs:text-lg sm:text-xl font-bold text-black mb-4 xs:mb-6 animate-fadeInUp relative">
            <span className="relative inline-block text-black">
              AI-Powered Learning & Skilling LMS 
              <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gray-500"></div>
            </span>
            <br /><span className="text-gray-700">that helps create, manage, deliver and track Online Courses.</span>
          </p>
          
          {/* Feature highlights with icons */}
          <div className="bg-gray-100/80 backdrop-blur-sm p-4 xs:p-5 rounded-xl shadow-lg mb-4 xs:mb-6 border-l-4 border-black">
            <ul className="space-y-2 xs:space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 text-lg w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">✨</span>
                <span className="flex-shrink-0 text-lg w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">✨</span>
                <p className="animate-fadeInUp2">Experience the intuitive interface and easy-to-use course creation tools that support multiple formats.</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 text-lg w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">📊</span>
                <span className="flex-shrink-0 text-lg w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">📊</span>
                <p className="animate-fadeInUp2">Review performance and gain insight with comprehensive reports and dashboards.</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 text-lg w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">📝</span>
                <span className="flex-shrink-0 text-lg w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">📝</span>
                <p className="animate-fadeInUp2">Gather valuable feedback from learners using our interactive survey tools.</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 text-lg w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">🔍</span>
                <span className="flex-shrink-0 text-lg w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">🔍</span>
                <p className="animate-fadeInUp2">Track training completion with extensive reporting for managers and trainers.</p>
              </li>
            </ul>
          </div>

          {/* Expandable Details Section - Enhanced */}
          {showMore && (
            <motion.div
              className="mb-4 xs:mb-6 space-y-3 xs:space-y-4 bg-gray-100 backdrop-blur-sm p-4 xs:p-6 rounded-xl shadow-lg border-l-4 border-gray-500 animate-fadeInUp2"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl font-bold text-black mb-4 flex items-center">
                <span className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                  <span className="text-gray-700">✦</span>
                </span>
                <span className="text-black">Key Features & Benefits</span>
              </h3>
              {additionalDetails.map((detail, index) => (
                <div key={index} className="border-b border-gray-400/30 pb-3 last:border-b-0 hover:bg-gray-200/10 p-2 rounded-lg transition-colors duration-300">
                  <h4 className="font-semibold text-black mb-2 flex items-center">
                    <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center mr-2 text-xs text-gray-700">{index + 1}</span>
                    {detail.title}
                  </h4>
                  <p className="text-gray-700 text-sm pl-8">{detail.description}</p>
                </div>
              ))}
            </motion.div>
          )}

          <button 
            onClick={() => setShowMore(!showMore)}
            className="px-4 xs:px-6 py-2 bg-black hover:bg-gray-900 text-white font-bold rounded-full shadow-md flex items-center gap-2 transition-all duration-300 animate-fadeInUp2 group border border-gray-300 text-sm xs:text-base"
          >
            {showMore ? 'Show less' : 'Know more'}
            <span className={`w-5 h-5 rounded-full bg-white/30 flex items-center justify-center transition-transform duration-300 ${showMore ? 'rotate-180' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
        </motion.div>
      </div>

      {/* Unique Features Section with Enhanced Design */}
  <div className="mt-16 xs:mt-20 sm:mt-24 relative">
  {/* Decorative elements */}
  <div className="absolute -top-12 -right-12 w-48 h-48 bg-gray-200 rounded-full opacity-30 blur-xl"></div>
  <div className="absolute bottom-10 left-10 w-32 h-32 bg-gray-300 rounded-full opacity-20 blur-lg"></div>
        
        {/* Section heading with ornate design */}
        <div className="relative mb-16 max-w-3xl mx-auto">
          <motion.div 
            className=""
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            
          </motion.div>
          
          <motion.h3
            className="text-3xl md:text-4xl font-black text-center mb-4 relative z-0 pb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <span className="text-black">What Makes</span>{" "}
            <span className="text-black">Us Unique?</span>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gray-500 rounded-full"></div>
          </motion.h3>
          
          <motion.p
            className="text-center text-gray-700 italic max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            viewport={{ once: true }}
          >
            Discover the powerful features that set our learning platform apart
          </motion.p>
        </div>
        
        {/* Feature cards with enhanced design */}
  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 xs:gap-8 max-w-6xl mx-auto px-2 xs:px-4">
          {[
            { 
              icon: "🧠", 
              title: "Smart Learning Path", 
              desc: "Personalized recommendations and adaptive learning journeys tailored to each student's progress.",
              color: "from-gray-500 to-gray-300",
              accent: "gray-500"
            },
            { 
              icon: "🌐", 
              title: "Learn Anywhere", 
              desc: "Access your courses on any device with our responsive platform and offline capability.",
              color: "from-gray-500 to-gray-300",
              accent: "gray-500"
            },
            { 
              icon: "🔒", 
              title: "Total Security", 
              desc: "Enterprise-grade protection for your data and progress with end-to-end encryption.",
              color: "from-gray-500 to-gray-300",
              accent: "gray-500"
            },
            { 
              icon: "🎯", 
              title: "Success Focused", 
              desc: "Designed to help you achieve real-world skills with practical applications and assessments.",
              color: "from-gray-500 to-gray-300",
              accent: "gray-500"
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              className="relative group"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
            >
              {/* Card glow effect */}
              <div className={`absolute -inset-1 bg-gradient-to-r ${item.color} rounded-2xl blur-sm opacity-75 group-hover:opacity-100 transition duration-300`}></div>
              
              {/* Card content */}
              <div className="relative bg-gray-100 rounded-2xl shadow-xl overflow-hidden h-full border border-gray-500/30 hover:transform hover:scale-[1.02] transition-all duration-500 cursor-pointer">
                {/* Top accent bar */}
                <div className={`h-2 w-full bg-gradient-to-r ${item.color}`}></div>
                <div className="p-7 flex flex-col items-center text-center bg-gray-100 rounded-2xl">
                  {/* Icon with styled container */}
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-gray-400">
                    <span className="text-3xl text-black">{item.icon}</span>
                  </div>
                  <h4 className="text-xl font-bold text-black mb-3 transition-colors duration-300">
                    {item.title}
                  </h4>
                  <p className="text-gray-700">{item.desc}</p>
                  {/* Hover indicator */}
                  <div className="mt-4 w-0 group-hover:w-1/2 h-1 bg-gray-500 transition-all duration-500 rounded-full"></div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Enhanced Learning Journey Section */}
  <div className="mt-20 xs:mt-24 sm:mt-28 max-w-5xl mx-auto px-2 xs:px-4 relative">
  {/* Decorative background elements */}
  <div className="absolute top-1/4 -left-20 w-40 h-40 bg-gray-200 rounded-full opacity-40 blur-xl"></div>
  <div className="absolute bottom-1/3 -right-16 w-32 h-32 bg-gray-300 rounded-full opacity-30 blur-xl"></div>
        
        {/* Section heading with decorative elements */}
        <div className="relative mb-16">
          <motion.div 
            className=""
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            {/* <div className="relative">
              <div className="absolute -top-8 -left-8 w-16 h-16 border-t-4 border-l-4  rounded-tl-lg opacity-60"></div>
              <div className="absolute -bottom-8 -right-8 w-16 h-16 border-b-4 border-r-4  rounded-br-lg opacity-60"></div>
              
              
            </div> */}
          </motion.div>
          
          <motion.h3
            className="text-3xl md:text-4xl font-black text-center mb-2"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <span className="text-black">Your</span>{" "}
            <span className="text-black">Learning</span>{" "}
            <span className="text-black">Journey</span>
          </motion.h3>
{/*           
          <div className="w-32 h-1 bg-black mx-auto rounded-full mb-4"></div>
          <div className="w-32 h-1 bg-gray-500 mx-auto rounded-full mb-4"></div> */}
          
          <motion.p
            className="text-center text-gray-700 max-w-2xl mx-auto mb-10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Follow these simple steps to transform your learning experience and achieve your goals
          </motion.p>
        </div>
        
        {/* Curved timeline path */}
        <div className="hidden lg:block absolute top-1/3 left-1/2 transform -translate-x-1/2 w-[80%] h-[400px]">
          <svg viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-20">
            <path d="M50,200 C150,100 250,300 400,200 C550,100 650,300 750,200" stroke="black" strokeWidth="8" strokeDasharray="20 20" />
          </svg>
        </div>
        
        {/* Journey steps in a grid */}
  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 xs:gap-8 relative z-10">
          {[
            { 
              icon: "✏️", 
              step: "Sign Up & Explore", 
              desc: "Create your profile and discover courses perfectly tailored for your learning style.",
              color: "gray-500",
              number: "01"
            },
            { 
              icon: "🎓", 
              step: "Enroll & Learn", 
              desc: "Join interactive courses, attend live sessions, and access materials anytime.",
              color: "gray-500",
              number: "02"
            },
            { 
              icon: "📊", 
              step: "Track Progress", 
              desc: "Monitor your improvement with detailed analytics and personalized feedback.",
              color: "gray-500",
              number: "03"
            },
            { 
              icon: "🏆", 
              step: "Achieve Goals", 
              desc: "Complete your learning path and earn recognized certificates for your skills.",
              color: "gray-500",
              number: "04"
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              className="relative"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.2 }}
              viewport={{ once: true }}
            >
              {/* Card with hover effects */}
              <div className={`bg-gray-100/80 rounded-xl p-6 shadow-xl border-t-4 border-${item.color} hover:shadow-2xl hover:transform hover:scale-105 transition-all duration-300 h-full flex flex-col`}>
                {/* Step number */}
                <div className="absolute -top-4 -right-2 bg-gray-100 w-10 h-10 rounded-full shadow-md flex items-center justify-center border-2 border-gray-400">
                  <span className="text-sm font-bold text-black">{item.number}</span>
                </div>
                {/* Icon container */}
                <div className="w-16 h-16 rounded-lg bg-gray-200 mb-4 flex items-center justify-center relative">
                  <span className="text-2xl text-black">{item.icon}</span>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-gray-500 border-2 border-gray-100"></div>
                </div>
                {/* Content */}
                <h4 className="text-xl font-bold text-black mb-3">{item.step}</h4>
                <p className="text-gray-700">{item.desc}</p>
                {/* Connected line for desktop */}
                {idx < 3 && (
                  <div className="hidden lg:block absolute -right-4 top-1/2 transform translate-y-1/2 w-8 border-t-2 border-dashed border-gray-500 z-0"></div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Bottom CTA */}
        <motion.div 
          className="text-center mt-10 xs:mt-12 sm:mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <button className="inline-flex items-center gap-2 px-4 xs:px-6 sm:px-8 py-2 xs:py-3 bg-black text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:translate-y-[-2px] hover:bg-gray-800 transition-all duration-300 border border-gray-300/70 text-sm xs:text-base">
            Start Your Journey
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default HomeSection2;