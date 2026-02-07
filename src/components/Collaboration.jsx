import { motion } from "framer-motion";
import { useState } from "react";

const Collaboration = () => {
  const [activeTab, setActiveTab] = useState("students");

  const collaborationFeatures = {
    students: [
      {
        icon: "👥",
        title: "Group Projects",
        description: "Collaborate on assignments with classmates using shared workspaces and real-time document editing."
      },
      {
        icon: "💬",
        title: "Discussion Forums",
        description: "Engage in meaningful conversations about course topics with peers and instructors."
      },
      {
        icon: "📝",
        title: "Peer Reviews",
        description: "Provide and receive feedback on assignments to improve learning outcomes."
      },
      {
        icon: "🤝",
        title: "Study Groups",
        description: "Form virtual study groups to prepare for exams and work through challenging material together."
      }
    ],
    instructors: [
      {
        icon: "👨‍🏫",
        title: "Team Teaching",
        description: "Co-create and co-teach courses with fellow educators to provide diverse perspectives."
      },
      {
        icon: "📊",
        title: "Shared Analytics",
        description: "Collaborate on analyzing student performance data to improve teaching methods."
      },
      {
        icon: "📚",
        title: "Content Sharing",
        description: "Share and reuse learning materials with other instructors to save time and effort."
      },
      {
        icon: "🔔",
        title: "Coordinated Announcements",
        description: "Send unified messages to students across multiple course sections."
      }
    ],
    organizations: [
      {
        icon: "🏛️",
        title: "Cross-Department Courses",
        description: "Create interdisciplinary learning experiences that span multiple departments."
      },
      {
        icon: "🌐",
        title: "Partner organizations",
        description: "Collaborate with other educational organizations to offer joint programs and certificates."
      },
      {
        icon: "🤖",
        title: "Shared AI Resources",
        description: "Pool AI tools and resources to enhance the learning experience across the institution."
      },
      {
        icon: "📈",
        title: "Unified Reporting",
        description: "Generate comprehensive reports that provide insights across all departments."
      }
    ]
  };

  return (
    <section className="w-full bg-gradient-to-br from-[#DFDAB6] via-[#E8E4C9] to-[#DFDAB6] py-16 px-4 md:px-16 lg:px-24 mt-6 sm:mt-8">
      <div className="max-w-6xl mx-auto relative">
        {/* Decorative elements */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-[#988913]/20 rounded-full opacity-30 blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-[#988913]/30 rounded-full opacity-20 blur-lg"></div>
        <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-[#988913]/10 rounded-full opacity-20 blur-md"></div>
        
        {/* Section Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          <h2 className="relative text-4xl md:text-5xl font-black mb-6 inline-block">
            <span className="text-[#988913] drop-shadow-sm">Powerful</span>{" "}
            <span className="bg-gradient-to-r from-[#988913] to-[#988913]/80 bg-clip-text text-transparent">Collaboration</span>
            
            {/* Underline accent */}
            <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-[#988913] to-[#988913]/60"></div>
          </h2>
          
          <p className="text-xl text-[#988913] max-w-3xl mx-auto">
            Our platform enables seamless collaboration between students, instructors, and organizations,
            creating a connected learning ecosystem.
          </p>
        </motion.div>
        
        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {["students", "instructors", "organizations"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 ${
                activeTab === tab 
                  ? "bg-[#988913] text-white shadow-lg" 
                  : "bg-[#DFDAB6] text-[#988913] hover:bg-[#988913]/20"
              }`}
            >
              For {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        
        {/* Collaboration Features Grid */}
        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          {collaborationFeatures[activeTab].map((feature, idx) => (
            <motion.div
              key={idx}
              className="relative group"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
            >
              {/* Card glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#988913] to-[#988913]/80 rounded-2xl blur-sm opacity-75 group-hover:opacity-100 transition duration-300"></div>
              
              {/* Card content */}
              <div className="relative bg-[#DFDAB6]/90 rounded-2xl shadow-xl overflow-hidden h-full border border-[#988913]/30 hover:transform hover:scale-[1.02] transition-all duration-500">
                {/* Top accent bar */}
                <div className="h-2 w-full bg-gradient-to-r from-[#988913] to-[#988913]/80"></div>
                
                <div className="p-7 flex flex-col items-center text-center">
                  {/* Icon with styled container */}
                  <div className="w-16 h-16 rounded-full bg-[#988913]/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-[#988913]/30">
                    <span className="text-3xl">{feature.icon}</span>
                  </div>
                  
                  <h4 className="text-xl font-bold text-[#988913] mb-3 transition-colors duration-300">
                    {feature.title}
                  </h4>
                  
                  <p className="text-[#6d6516]">{feature.description}</p>
                  
                  {/* Hover indicator */}
                  <div className="mt-4 w-0 group-hover:w-1/2 h-1 bg-[#988913] transition-all duration-500 rounded-full"></div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Collaboration Showcase */}
        <motion.div 
          className="mt-20 bg-[#DFDAB6]/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg border-l-4 border-[#988913]"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/3 relative">
              <div className="relative z-10 bg-gradient-to-br from-[#988913]/40 to-[#DFDAB6] p-3 rounded-2xl shadow-xl transform rotate-1 hover:rotate-0 transition-all duration-500">
                <img 
                  src="pp1.jpg" 
                  alt="Collaboration" 
                  className="rounded-xl shadow-inner object-cover h-[240px] w-full transform hover:scale-102 transition-all duration-500 border-2 border-[#988913]/30"
                />
                
                {/* Floating decorative elements */}
                <div className="absolute -top-6 -right-6 w-12 h-12 bg-[#988913] rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg animate-float">
                  <span>🤝</span>
                </div>
              </div>
              
              {/* Background pattern elements */}
              <div className="absolute top-1/3 -left-4 w-16 h-16 border-4 border-dashed border-[#988913] rounded-lg opacity-60 transform rotate-12 z-0"></div>
            </div>
            
            <div className="w-full md:w-2/3">
              <h3 className="text-2xl font-bold text-[#988913] mb-4">Real-Time Collaboration Tools</h3>
              <p className="text-[#6d6516] mb-6">
                Our platform offers a suite of real-time collaboration tools that make working together seamless and productive. 
                From shared document editing to interactive whiteboards and video conferencing, our tools are designed to 
                facilitate meaningful interactions regardless of physical location.
              </p>
              
              <div className="flex flex-wrap gap-3">
                {["Video Conferencing", "Shared Documents", "Interactive Whiteboards", "Chat & Messaging"].map((tool, idx) => (
                  <span key={idx} className="px-4 py-2 bg-[#988913]/20 text-[#988913] rounded-full text-sm font-medium">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Call to Action */}
        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <button className="inline-flex items-center gap-2 px-8 py-3 bg-[#988913] text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:translate-y-[-2px] hover:bg-[#7d7210] transition-all duration-300 border border-[#DFDAB6]/70">
            Start Collaborating Today
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </motion.div>
        
        {/* Testimonials */}
        <div className="mt-24 relative">
          <motion.div 
            className="bg-[#DFDAB6] p-8 rounded-2xl shadow-lg border border-[#988913]/30"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <div className="flex flex-col items-center text-center">
              <h3 className="text-2xl font-bold text-[#988913] mb-8 relative">
                What Our Users Say About Collaboration
                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-[#988913] rounded-full"></div>
              </h3>
              
              <div className="flex flex-col md:flex-row gap-6">
                {[
                  {
                    quote: "The collaboration tools have transformed how our students work together on projects. The seamless integration makes group assignments much more productive.",
                    author: "Dr. Sarah Johnson",
                    role: "Professor, Computer Science"
                  },
                  {
                    quote: "As a student, I love how easy it is to form study groups and work on assignments together. The real-time document editing has been a game-changer for our team projects.",
                    author: "Michael Chen",
                    role: "Graduate Student"
                  }
                ].map((testimonial, idx) => (
                  <div key={idx} className="bg-[#988913]/10 p-6 rounded-xl relative">
                    <div className="absolute -top-4 -left-4 text-4xl text-[#988913]/60">"</div>
                    <div className="absolute -bottom-4 -right-4 text-4xl text-[#988913]/60">"</div>
                    <p className="text-[#6d6516] italic mb-4">{testimonial.quote}</p>
                    <div>
                      <p className="font-bold text-[#988913]">{testimonial.author}</p>
                      <p className="text-sm text-[#988913]/80">{testimonial.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Collaboration;
