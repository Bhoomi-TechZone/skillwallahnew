import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const WhoWeAreSection = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [partnerFormData, setPartnerFormData] = useState({
    organizationName: '',
    organizationType: '',
    website: '',
    contactName: '',
    designation: '',
    email: '',
    phone: '',
    collaborationAreas: [],
    message: '',
    agreedToContact: false
  });
  // Animation variants for Why Choose Us section
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Handle partner form submission
  const handlePartnerFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox' && name === 'collaborationAreas') {
      setPartnerFormData(prev => ({
        ...prev,
        collaborationAreas: checked
          ? [...prev.collaborationAreas, value]
          : prev.collaborationAreas.filter(area => area !== value)
      }));
    } else if (type === 'checkbox') {
      setPartnerFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setPartnerFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePartnerFormSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:4000/partnership_request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(partnerFormData)
      });

      const result = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
        // Reset form after 3 seconds
        setTimeout(() => {
          setIsSubmitted(false);
          setIsPartnerModalOpen(false);
          setPartnerFormData({
            organizationName: '',
            organizationType: '',
            website: '',
            contactName: '',
            designation: '',
            email: '',
            phone: '',
            collaborationAreas: [],
            message: '',
            agreedToContact: false
          });
        }, 3000);
      } else {
        alert(`❌ Error: ${result.message || 'Failed to submit partnership request'}`);
      }
    } catch (error) {
      console.error("Error submitting partnership request:", error);
      alert("❌ Network error. Please try again later.");
    }
  };

  return (
    <div className="flex flex-col">
      {/* Who We Are Section */}
      <div className="relative bg-[#333]" style={{ minHeight: '500px' }}>
        {/* Background image - dark with students collaborating */}
        <div className="absolute inset-0">
          <img
            src="./img4.jpg"
            alt="Students collaborating"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-black/50"></div>
        </div>

        {/* Content */}
        <div className="relative max-w-5xl mx-auto px-6 py-16 text-center">
          {/* Top header with red underline */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-4"
          >
            <h3 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wider">
              SWE: Where Knowledge Meets Opportunity.
            </h3>

          </motion.div>

          {/* Main title - large with special font */}
          <motion.h2
            className="text-4xl md:text-6xl font-bold text-white mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Who we are
            <div className="flex justify-center mt-2">
              <div className="w-64">
                <div className="h-1 w-full bg-[#988913]"></div>
                <div className="h-1 w-full bg-white"></div>
                <div className="h-1 w-full bg-[#c5a32e]"></div>
              </div>
            </div>
          </motion.h2>

          {/* Description - white text with good spacing */}
          <motion.p
            className="text-base md:text-lg leading-relaxed mb-12 text-white max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            The Skill Wallah EdTech (SWE) is a globally recognized institution headquartered in
            London. We combine the prestige of British education with innovative edtech solutions, offering online and offline
            programs for students, professionals, and organizations worldwide.
          </motion.p>

          {/* Button - bordered white with hover effect */}
          <motion.button
            className="mt-6 px-10 py-3 text-white border-2 border-white rounded-none hover:bg-white hover:text-gray-900 transition duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            viewport={{ once: true }}
            onClick={() => setIsModalOpen(true)}
          >
            Learn More About SWE
          </motion.button>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="relative py-20 bg-gradient-to-br from-white via-amber-50/30 to-yellow-50/30 overflow-hidden">
        {/* Background SkillWallah Logo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <div className="text-center">
            <div className="text-[15rem] md:text-[20rem] lg:text-[25rem] font-bold text-amber-600 leading-none select-none pointer-events-none">
              SkillWallah
            </div>
            <div className="text-[6rem] md:text-[8rem] lg:text-[10rem] font-bold text-amber-500 leading-none select-none pointer-events-none -mt-12">
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

        {/* Content container */}
        <div className="relative z-10 max-w-6xl mx-auto px-4">
          {/* Section heading with underline */}
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 mb-6"
            >
              Why Choose <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">Us?</span>
            </motion.h2>

            {/* Updated underline with Pale Olivetheme */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-32 h-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full mx-auto mb-8"
            />

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-xl text-slate-600 max-w-3xl mx-auto font-medium leading-relaxed"
            >
              Discover what makes SkillWallah EdTech London's premier choice for digital education and professional development
            </motion.p>
          </div>

          {/* Modern Feature Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {/* Card 1 - British Academic Heritage */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
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
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Card 2 - Dual Learning Modes */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
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
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Card 3 - Global Educator Network */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
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
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </motion.div>

            {/* Card 4 - Innovative Pedagogy */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
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
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Global Collaboration & Partnerships Section */}
      <div className="relative py-16" style={{
        backgroundColor: '#f5f5f5',
        minHeight: '500px',
      }}>
        <div className="relative max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Left side - Image with carousel dots */}
            <div className="w-full md:w-1/2">
              <div className="relative">
                <img
                  src="./img2.jpg"
                  alt="Students collaborating"
                  className="w-full rounded-lg shadow-lg object-cover"
                  style={{ height: '400px' }}
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <div className="flex gap-2">
                    <span className="h-3 w-3 rounded-full bg-white opacity-100"></span>
                    <span className="h-3 w-3 rounded-full bg-white opacity-50"></span>
                    <span className="h-3 w-3 rounded-full bg-white opacity-50"></span>
                    <span className="h-3 w-3 rounded-full bg-white opacity-50"></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Content */}
            <div className="w-full md:w-1/2">
              <motion.h2
                initial={{ opacity: 0, y: -10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-3xl md:text-4xl font-bold text-[#2e5288] mb-6"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                GLOBAL COLLABORATION & PARTNERSHIPS
              </motion.h2>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <ul className="space-y-4 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-[#2e5288] font-bold mr-2 text-xl">•</span>
                    <span>We collaborate with schools, universities, and corporations worldwide to deliver programs in communication, pedagogy, leadership, and professional development. Partnering with SWE means unlocking global recognition and international credibility.</span>
                  </li>
                </ul>

                <motion.button
                  className="mt-8 px-8 py-3 bg-[#2e5288] text-white rounded-none hover:bg-[#1e3c68] transition duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsPartnerModalOpen(true)}
                >
                  Become a Partner
                </motion.button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="bg-[#2e5288] text-white p-6 rounded-t-lg">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  About Skill Wallah EdTech
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-white hover:text-gray-300 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Introduction */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-[#2e5288] mb-4">Our Legacy</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  The Skill Wallah EdTech (SWE) stands as a beacon of excellence in global education,
                  combining over two decades of British educational heritage with cutting-edge digital innovation. Headquartered
                  in the heart of London, we have established ourselves as a premier institution for professional development,
                  academic excellence, and transformative learning experiences.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Our commitment extends beyond traditional boundaries, serving students, professionals, and organizations
                  across six continents through our innovative blend of online and offline educational delivery methods.
                </p>
              </div>

              {/* Mission & Vision */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#f5ead8] p-6 rounded-lg">
                  <h3 className="text-xl font-bold text-[#2e5288] mb-3">Our Mission</h3>
                  <p className="text-gray-700">
                    To democratize quality education by making world-class British education accessible globally,
                    fostering innovation, critical thinking, and professional excellence in every learner.
                  </p>
                </div>
                <div className="bg-[#f5ead8] p-6 rounded-lg">
                  <h3 className="text-xl font-bold text-[#2e5288] mb-3">Our Vision</h3>
                  <p className="text-gray-700">
                    To be the world's leading institution bridging traditional academic excellence with modern
                    technological innovation, creating global leaders and change-makers.
                  </p>
                </div>
              </div>

              {/* Key Highlights */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-[#2e5288] mb-4">Key Highlights</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start">
                    <span className="text-[#2e5288] text-xl mr-3">🏛️</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">British Academic Excellence</h4>
                      <p className="text-gray-600 text-sm">Rooted in centuries-old British educational traditions</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[#2e5288] text-xl mr-3">🌍</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">Global Reach</h4>
                      <p className="text-gray-600 text-sm">Students and partners across 50+ countries</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[#2e5288] text-xl mr-3">💻</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">Digital Innovation</h4>
                      <p className="text-gray-600 text-sm">State-of-the-art learning management systems</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-[#2e5288] text-xl mr-3">👥</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">Expert Faculty</h4>
                      <p className="text-gray-600 text-sm">Industry leaders and academic experts</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Programs Offered */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-[#2e5288] mb-4">Programs We Offer</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-[#2e5288] mb-2">Professional Development</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Leadership & Management</li>
                      <li>• Communication Skills</li>
                      <li>• Project Management</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-[#2e5288] mb-2">Academic Programs</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Business Administration</li>
                      <li>• Digital Marketing</li>
                      <li>• International Relations</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-[#2e5288] mb-2">Corporate Training</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Team Building</li>
                      <li>• Skills Enhancement</li>
                      <li>• Custom Solutions</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Accreditations */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-[#2e5288] mb-4">Accreditations & Partnerships</h3>
                <p className="text-gray-700 mb-4">
                  SWE is proud to be recognized by leading educational bodies and maintains strategic partnerships
                  with universities, corporations, and organizations worldwide. Our qualifications are internationally
                  recognized and valued by employers globally.
                </p>
                <div className="bg-[#f5ead8] p-4 rounded-lg">
                  <p className="text-gray-700 font-medium">
                    ✓ British Educational Standards • ✓ International Recognition • ✓ Industry Partnerships • ✓ Quality Assurance
                  </p>
                </div>
              </div>

              {/* Call to Action */}
              <div className="text-center">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    navigate('/ContactUs');
                  }}
                  className="border-2 border-[#2e5288] text-[#2e5288] px-8 py-3 rounded-lg hover:bg-[#2e5288] hover:text-white transition duration-300"
                >
                  Contact Us
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Partnership Modal */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            {/* Modal Header */}
            <div className="bg-[#2e5288] text-white p-6 rounded-t-lg">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Partnership Request
                </h2>
                <button
                  onClick={() => setIsPartnerModalOpen(false)}
                  className="text-white hover:text-gray-300 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <p className="mt-2 text-white/90">
                Join our global network of educational partners and unlock new opportunities for collaboration.
              </p>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="mb-6">
                    <svg className="mx-auto h-16 w-16 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-[#2e5288] mb-4">Thank You!</h3>
                  <p className="text-gray-700 text-lg">
                    Thank you for reaching out! Our partnerships team will contact you within 2–3 business days.
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePartnerFormSubmit} className="space-y-8">
                  {/* Organization Details */}
                  <div>
                    <h3 className="text-xl font-bold text-[#2e5288] mb-4 border-b border-gray-200 pb-2">
                      1. Organization Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Organization Name *
                        </label>
                        <input
                          type="text"
                          name="organizationName"
                          value={partnerFormData.organizationName}
                          onChange={handlePartnerFormChange}
                          placeholder="ABC International School"
                          required
                          className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg focus:ring-0 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Type of Organization *
                        </label>
                        <select
                          name="organizationType"
                          value={partnerFormData.organizationType}
                          onChange={handlePartnerFormChange}
                          required
                          className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg focus:ring-0 focus:outline-none"
                        >
                          <option value="">Select type...</option>
                          <option value="School">School</option>
                          <option value="University">University</option>
                          <option value="Corporation">Corporation</option>
                          <option value="NGO">NGO</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Website / Social Media Link (Optional)
                        </label>
                        <input
                          type="url"
                          name="website"
                          value={partnerFormData.website}
                          onChange={handlePartnerFormChange}
                          placeholder="https://www.yourorganization.com"
                          className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg focus:ring-0 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Person Information */}
                  <div>
                    <h3 className="text-xl font-bold text-[#2e5288] mb-4 border-b border-gray-200 pb-2">
                      2. Contact Person Information
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          name="contactName"
                          value={partnerFormData.contactName}
                          onChange={handlePartnerFormChange}
                          placeholder="John Smith"
                          required
                          className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg focus:ring-0 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Designation / Role *
                        </label>
                        <input
                          type="text"
                          name="designation"
                          value={partnerFormData.designation}
                          onChange={handlePartnerFormChange}
                          placeholder="Principal, HR Director, Head of Training"
                          required
                          className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg focus:ring-0 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={partnerFormData.email}
                          onChange={handlePartnerFormChange}
                          placeholder="john.smith@organization.com"
                          required
                          className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg focus:ring-0 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Phone Number (Recommended)
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={partnerFormData.phone}
                          onChange={handlePartnerFormChange}
                          placeholder="+44 20 1234 5678"
                          className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg focus:ring-0 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Partnership Interest */}
                  <div>
                    <h3 className="text-xl font-bold text-[#2e5288] mb-4 border-b border-gray-200 pb-2">
                      3. Partnership Interest
                    </h3>
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Area(s) of Collaboration (Select all that apply)
                      </label>
                      <div className="grid md:grid-cols-2 gap-3">
                        {[
                          'Communication Training',
                          'Leadership Development',
                          'Pedagogy / Teaching Excellence',
                          'Professional Development',
                          'Student Exchange',
                          'Research & Innovation'
                        ].map((area) => (
                          <label key={area} className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              name="collaborationAreas"
                              value={area}
                              checked={partnerFormData.collaborationAreas.includes(area)}
                              onChange={handlePartnerFormChange}
                              className="h-4 w-4 text-[#2e5288] focus:ring-[#2e5288] border-gray-300 rounded"
                            />
                            <span className="text-gray-700">{area}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Message / Proposal
                      </label>
                      <textarea
                        name="message"
                        value={partnerFormData.message}
                        onChange={handlePartnerFormChange}
                        rows="4"
                        placeholder="We'd like to collaborate on a leadership development program for educators..."
                        className="w-full p-3 border-2 border-gray-200 focus:border-[#2e5288] transition duration-200 rounded-lg resize-y focus:ring-0 focus:outline-none"
                      ></textarea>
                    </div>
                  </div>

                  {/* Agreement & Submission */}
                  <div>
                    <h3 className="text-xl font-bold text-[#2e5288] mb-4 border-b border-gray-200 pb-2">
                      4. Agreement & Submission
                    </h3>
                    <div className="mb-6">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="agreedToContact"
                          checked={partnerFormData.agreedToContact}
                          onChange={handlePartnerFormChange}
                          required
                          className="h-4 w-4 text-[#2e5288] focus:ring-[#2e5288] border-gray-300 rounded mt-1"
                        />
                        <span className="text-gray-700">
                          I agree to be contacted by the SWE Partnerships Team regarding this partnership request.
                        </span>
                      </label>
                    </div>

                    <div className="text-center">
                      <motion.button
                        type="submit"
                        disabled={!partnerFormData.agreedToContact}
                        whileHover={{ scale: partnerFormData.agreedToContact ? 1.02 : 1 }}
                        whileTap={{ scale: partnerFormData.agreedToContact ? 0.98 : 1 }}
                        className={`px-8 py-3 rounded-lg font-semibold transition duration-300 ${partnerFormData.agreedToContact
                          ? 'bg-[#2e5288] hover:bg-[#1e3c68] text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                      >
                        Submit Partnership Request
                      </motion.button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default WhoWeAreSection;
