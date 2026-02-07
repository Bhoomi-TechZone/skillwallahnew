import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const StudentTestimonials = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Extended testimonial data for multiple slides
  const testimonials = [
    {
      id: 1,
      name: "Sarah Johnson",
      position: "Full Stack Developer at TechCorp",
      avatar: "/pic1.jpg", 
      quote: "SkillWallah EdTech transformed my career completely! The hands-on projects and expert mentorship helped me land my dream job in just 6 months. The quality of education here is truly world-class.",
      date: "Graduate, 2024.10.15",
      flag: "🇺🇸"
    },
    {
      id: 2,
      name: "Rajesh Kumar",
      position: "Data Scientist at Microsoft",
      avatar: "/pic2.jpg",
      quote: "The AI and Machine Learning course exceeded my expectations. The curriculum was cutting-edge and the instructors were industry experts. Now I'm working at my dream company!",
      date: "Graduate, 2024.09.22",
      flag: "��"
    },
    {
      id: 3,
      name: "Emily Chen",
      position: "UI/UX Designer at Google",
      avatar: "/pic3.jpg",
      quote: "The design thinking approach and practical projects at SkillWallah gave me the confidence to pursue my passion. The support system here is incredible and truly life-changing.",
      date: "Graduate, 2024.08.30",
      flag: "🇨🇦"
    },
    {
      id: 4,
      name: "Ahmed Hassan",
      position: "DevOps Engineer at Amazon",
      avatar: "/pic4.jpg",
      quote: "From zero to hero in cloud computing! The comprehensive curriculum and real-world experience prepared me perfectly for the industry. Best investment I've ever made in my career.",
      date: "Graduate, 2024.07.18",
      flag: "🇦🇪"
    },
    {
      id: 5,
      name: "Maria Rodriguez",
      position: "Cybersecurity Analyst at IBM",
      avatar: "/pic1.jpg",
      quote: "The cybersecurity program at SkillWallah is top-notch. The hands-on labs and expert guidance helped me transition from a different field into cybersecurity successfully.",
      date: "Graduate, 2024.06.12",
      flag: "🇪🇸"
    },
    {
      id: 6,
      name: "James Wilson",
      position: "Product Manager at Meta",
      avatar: "/pic2.jpg",
      quote: "The product management course gave me all the tools I needed to excel in my role. The case studies and mentorship were invaluable for my career growth.",
      date: "Graduate, 2024.05.25",
      flag: "🇬🇧"
    },
    {
      id: 7,
      name: "Lisa Thompson",
      position: "Mobile App Developer",
      avatar: "/pic3.jpg",
      quote: "Learning mobile development here was an amazing journey. The projects were challenging yet rewarding, and the support from instructors was outstanding.",
      date: "Graduate, 2024.04.08",
      flag: "��"
    },
    {
      id: 8,
      name: "David Kim",
      position: "Blockchain Developer at Ethereum",
      avatar: "/pic4.jpg",
      quote: "The blockchain development course was comprehensive and up-to-date with the latest technologies. Now I'm working on cutting-edge projects in Web3!",
      date: "Graduate, 2024.03.14",
      flag: "🇰🇷"
    }
  ];

  // Group testimonials into slides of 4
  const testimonialSlides = [];
  for (let i = 0; i < testimonials.length; i += 4) {
    testimonialSlides.push(testimonials.slice(i, i + 4));
  }

  // Auto-slide effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => 
        prev === testimonialSlides.length - 1 ? 0 : prev + 1
      );
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [testimonialSlides.length]);
  
  return (
    <div className="relative py-8 sm:py-12 md:py-16" style={{ 
      backgroundColor: '#f2f2f2',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Skill Wallah EdTech logo with graduation cap in background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img 
          src="/logosingle.png" 
          alt="Skill Wallah EdTech Logo Background"
          className="absolute opacity-20" 
          style={{ maxWidth: '250px', width: '50%' }}
        />
      </div>

      {/* Container */}
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section heading with red underline */}
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4"
            style={{ 
              fontFamily: "'Playfair Display', serif",
              color: '#2E5288' // Exact ambercolor from image
            }}
          >
            WHAT OUR STUDENT SAYS
          </motion.h2>
          
          {/* amberand red underline as in image */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="relative w-48 sm:w-56 md:w-64 h-3">
              <div className="absolute inset-0 h-1" style={{ backgroundColor: '#2E5288' }}></div>
              <div className="absolute inset-0 top-1 h-1" style={{ backgroundColor: '#FFFFFF' }}></div>
              <div className="absolute inset-0 top-2 h-1" style={{ backgroundColor: '#e63946' }}></div>
            </div>
          </motion.div>
        </div>

        {/* Auto-Sliding Testimonial Cards */}
        <div className="relative mx-auto max-w-7xl">
          {/* Gradient background element */}
          <div className="absolute inset-0 opacity-10" 
            style={{
              background: 'radial-gradient(circle, rgba(180,190,200,1) 0%, rgba(242,242,242,0) 70%)',
            }}
          ></div>
          
          {/* Slider Container */}
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4"
              >
                {testimonialSlides[currentSlide]?.map((testimonial, index) => (
                  <motion.div
                    key={testimonial.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ 
                      y: -8,
                      scale: 1.02,
                      boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
                      transition: { duration: 0.3 }
                    }}
                    className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
                    style={{
                      transform: `rotate(${index % 2 === 0 ? '-1' : '1'}deg)`,
                      transformOrigin: 'center center'
                    }}
                  >
                    {/* Student Info Header */}
                    <div className="flex items-center mb-4">
                      <div className="w-14 h-14 rounded-full overflow-hidden mr-4 border-2 border-amber-200 shadow-md">
                        <img 
                          src={testimonial.avatar} 
                          alt={testimonial.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/56x56/f59e0b/ffffff?text=' + testimonial.name.charAt(0);
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900 mb-1">{testimonial.name}</h4>
                        <p className="text-sm text-amber-600 font-medium">{testimonial.position}</p>
                      </div>
                    </div>
                    
                    {/* Quote */}
                    <div className="mb-4">
                      <div className="text-4xl text-amber-400 mb-2 leading-none">"</div>
                      <p className="text-gray-700 text-sm leading-relaxed font-medium">
                        {testimonial.quote}
                      </p>
                    </div>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                      <span className="flex items-center">
                        <span className="text-lg mr-2">{testimonial.flag}</span>
                        {testimonial.date}
                      </span>
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="text-sm">★</span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Slide Indicators */}
          <div className="flex justify-center mt-8 space-x-2">
            {testimonialSlides.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'bg-amber-500 w-8' 
                    : 'bg-gray-300 hover:bg-amber-300'
                }`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>

          {/* Navigation Arrows */}
          <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
            <button
              onClick={() => setCurrentSlide(currentSlide === 0 ? testimonialSlides.length - 1 : currentSlide - 1)}
              className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-amber-50 hover:border-amber-200 transition-all duration-300 group"
            >
              <svg className="w-5 h-5 text-gray-600 group-hover:text-amber-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
            <button
              onClick={() => setCurrentSlide(currentSlide === testimonialSlides.length - 1 ? 0 : currentSlide + 1)}
              className="w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-amber-50 hover:border-amber-200 transition-all duration-300 group"
            >
              <svg className="w-5 h-5 text-gray-600 group-hover:text-amber-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Slide Counter */}
          <div className="text-center mt-4">
            <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
              {currentSlide + 1} / {testimonialSlides.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentTestimonials;
