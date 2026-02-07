// Use public folder path for image
const pexel3 = "/h2.jpg";
const data =
  "English Class Pvt Ltd offers a modern online platform for mastering English. Access live classes, grammar lessons, exam prep, and more from anywhere. Track your progress, download study materials, and earn certificates—all in one place.";
import { motion } from "framer-motion";
import { useState } from "react";
// ...existing code...
const HomeSection3 = () => {
  const [showExtra, setShowExtra] = useState(false);
  return (
    <section className="w-full bg-gradient-to-br from-white via-gray-100 to-white py-8 xs:py-12 sm:py-16 px-2 xs:px-4 sm:px-6 md:px-12 lg:px-24 shadow-2xl">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 xs:gap-10 md:gap-12">
        {/* Left: Text Content */}
        <motion.div
          className="w-full xs:w-11/12 sm:w-4/5 md:w-1/2 text-center md:text-left"
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-extrabold text-black mb-3 xs:mb-4 leading-tight animate-pulse">
            <span className="bg-gradient-to-r from-black to-gray-700 bg-clip-text text-transparent">Your Online English Learning Platform</span>
            <br />
            <span className="text-gray-700">Study Anywhere, Anytime</span>
          </h2>

          <p className="text-base xs:text-lg sm:text-xl text-gray-700 font-semibold mb-4 xs:mb-6 animate-fadeInUp">{data}</p>

          <button
            className="mt-2 px-4 xs:px-6 py-2 bg-gradient-to-r from-black to-gray-700 text-white font-bold text-base xs:text-lg rounded-full shadow-lg hover:bg-gray-800 transition flex items-center gap-2 mx-auto md:mx-0 animate-fadeInUp2 border border-gray-200"
            onClick={() => setShowExtra((prev) => !prev)}
          >
            Know more
            <svg className={`w-5 h-5 transform transition-transform ${showExtra ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>

          {showExtra && (
            <motion.div
              className="mt-6 xs:mt-8 p-4 xs:p-6 bg-gray-100 rounded-2xl shadow-xl border border-gray-300 text-gray-800 animate-fadeInUp2"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl font-bold text-black mb-3">Why Learn English Online With Us?</h3>
              <ul className="list-disc pl-6 space-y-2 text-base text-gray-700">
                <li>Live interactive English classes with expert trainers</li>
                <li>Access to recorded lessons for revision</li>
                <li>Downloadable grammar and vocabulary worksheets</li>
                <li>Progress tracking and completion certificates</li>
                <li>Mobile-friendly platform for learning on the go</li>
                <li>One-on-one doubt clearing sessions</li>
                <li>Community forums for peer support</li>
              </ul>
            </motion.div>
          )}
        </motion.div>

        {/* Right: Image Placeholder */}
        <motion.div
          className="w-full xs:w-10/12 sm:w-4/5 md:w-1/2 flex justify-center relative"
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
            <img src="/h2.jpg" alt="English online" className="w-full max-w-[340px] xs:max-w-[280px] sm:max-w-[320px] md:max-w-[340px] rounded-2xl shadow-xl border-4 border-gray-700 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-gray-200/20 rounded-2xl pointer-events-none" />
        </motion.div>
      </div>

      {/* New Animated Quote/Testimonial Section */}
  <div className="mt-12 xs:mt-16 sm:mt-20 max-w-3xl mx-auto">
        <motion.h3
          className="text-xl xs:text-2xl sm:text-3xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-black to-gray-700 mb-6 xs:mb-8 animate-pulse"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          What Our Learners Say
        </motion.h3>
        <motion.blockquote
          className="relative bg-gradient-to-br from-white to-gray-100 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-gray-700 p-6 xs:p-8 sm:p-10 text-center text-base xs:text-lg sm:text-xl font-semibold text-gray-800 animate-fadeInUp"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          <span className="text-5xl text-black absolute left-6 top-4 opacity-80">"</span>
          <span className="block mt-4 text-gray-700">This platform made learning English fun and effective! The live classes, resources, and support helped me achieve my goals faster than I imagined.</span>
          <span className="text-5xl text-black absolute right-6 bottom-4 opacity-80">"</span>
          <div className="mt-6 flex flex-col items-center">
            <div className="w-16 h-16 xs:w-20 xs:h-20 rounded-full border-4 border-gray-700 shadow-lg mb-2 overflow-hidden">
              <img src="/pp1.jpg" alt="Learner" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-black">Aarav Sharma</span>
            <span className="text-sm text-gray-700">Student, Mumbai</span>
          </div>
        </motion.blockquote>
      </div>

      {/* Added Feature Icons Section */}
  <div className="mt-16 xs:mt-20 sm:mt-24 max-w-6xl mx-auto">
        <motion.h3
          className="text-xl xs:text-2xl sm:text-3xl font-extrabold text-center mb-8 xs:mb-12 text-black"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          <span className="bg-gradient-to-r from-black to-gray-700 bg-clip-text text-transparent">
            Premium Features For Premium Learning
          </span>
        </motion.h3>
        
  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 xs:gap-8">
          {[
            { icon: "🎓", title: "Expert Instructors", desc: "Learn from certified language experts" },
            { icon: "🔄", title: "Flexible Schedule", desc: "Classes that fit your busy lifestyle" },
            { icon: "📱", title: "Mobile Learning", desc: "Study on any device, anywhere" },
            { icon: "🏆", title: "Certification", desc: "Earn recognized credentials" }
          ].map((item, index) => (
            <motion.div
              key={index}
              className="bg-white rounded-xl shadow-lg p-4 xs:p-6 border-2 border-gray-200 hover:border-black transition-all hover:shadow-gray-400/20 hover:-translate-y-1"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              viewport={{ once: true }}
            >
              <div className="text-3xl xs:text-4xl mb-3 xs:mb-4 bg-gray-100 w-12 h-12 xs:w-16 xs:h-16 rounded-full flex items-center justify-center shadow-inner border border-gray-300">
                {item.icon}
              </div>
              <h4 className="text-base xs:text-lg sm:text-xl font-bold text-black mb-1 xs:mb-2">{item.title}</h4>
              <p className="text-gray-600 text-sm xs:text-base">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Call to Action Section */}
      <motion.div 
        className="mt-12 xs:mt-16 sm:mt-20 text-center"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        viewport={{ once: true }}
      >
               <h3 className="text-xl xs:text-2xl sm:text-3xl font-bold mb-4 xs:mb-6 text-black">Ready to start your language journey?</h3>
        <button className="px-4 xs:px-6 sm:px-8 py-2 xs:py-3 bg-gradient-to-r from-black to-gray-700 text-white font-bold text-base xs:text-lg rounded-full shadow-lg hover:shadow-gray-400/30 hover:bg-gray-800 transition transform hover:scale-105 border border-gray-200">
          Enroll Today
        </button>
      </motion.div>
    </section>
  );
};

export default HomeSection3;