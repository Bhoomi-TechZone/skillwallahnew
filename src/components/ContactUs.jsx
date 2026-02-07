import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  Calendar, ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  HeadphonesIcon,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone, Send,
  Star,
  User,
  Users,
  Zap
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaTwitter,
  FaWhatsapp,
  FaYoutube
} from "react-icons/fa";

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [activeAccordion, setActiveAccordion] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const companydata = {
    name: "Get in Touch",
    address: "Registered Office Address:\nA43,\nSector 63,\nNoida,\nUttar Pradesh, India.",
    website: "www.skillwallahedtech.com",
    email: "info@skillwallahedtech.com",
    phone: "+91 7454054995",
    supportEmail: "support@skillwallahedtech.com",
    admissionsEmail: "admissions@skillwallahedtech.com",
    collaborationEmail: "collaboration@skillwallahedtech.com",
    directorEmail: "director@skillwallahedtech.com",
    businessHours: "Monday - Friday: 9:00 AM - 6:00 PM GMT",
    weekendHours: "Saturday: 10:00 AM - 4:00 PM GMT",
    responseTime: "24-48 hours",
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:4000/enquiry/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          category: "general"
        })
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ Message submitted successfully! Thank you for contacting us.");
        setFormData({ name: "", email: "", phone: "", message: "" });
      } else {
        alert(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Error submitting enquiry:", error);
      alert("❌ Network error. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAccordion = (index) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  const faqData = [
    {
      question: "How do I apply for courses?",
      answer: "Simply browse our course catalog, select your desired program, and complete the online application form. Our admissions team will guide you through the process step by step.",
      icon: BookOpen
    },
    {
      question: "Are the courses internationally recognized?",
      answer: "Yes, all our programs are internationally accredited and recognized by leading industry bodies and educational organizations worldwide, ensuring global career opportunities.",
      icon: Globe
    },
    {
      question: "Do you offer flexible learning options?",
      answer: "We offer multiple learning formats including online, hybrid, and in-person classes to accommodate different schedules and learning preferences.",
      icon: Clock
    },
    {
      question: "What support is available for students?",
      answer: "We provide comprehensive support including academic mentoring, technical assistance, career guidance, and 24/7 student helpdesk with dedicated support staff.",
      icon: HeadphonesIcon
    },
    {
      question: "Are there scholarship opportunities?",
      answer: "Yes, we offer various scholarship programs and financial aid options based on merit and need. Contact our admissions team for detailed eligibility criteria.",
      icon: Award
    },
    {
      question: "How can I schedule a consultation?",
      answer: "You can book a free consultation through our contact form, call our office directly, or use our online booking system available 24/7.",
      icon: Calendar
    }
  ];

  const contactMethods = [
    {
      title: "General Inquiries",
      icon: Mail,
      color: "from-amber-500 to-yellow-600",
      items: [
        { label: "Email", value: companydata.email },
        { label: "Phone", value: companydata.phone },
        { label: "Response Time", value: companydata.responseTime }
      ]
    },
    {
      title: "Academic Support",
      icon: BookOpen,
      color: "from-orange-500 to-amber-600",
      items: [
        { label: "Admissions", value: companydata.admissionsEmail },
        { label: "Support", value: companydata.supportEmail },
        { label: "Business Hours", value: companydata.businessHours }
      ]
    },
    {
      title: "Partnerships",
      icon: Zap,
      color: "from-yellow-500 to-orange-600",
      items: [
        { label: "Collaboration", value: companydata.collaborationEmail },
        { label: "Director Office", value: companydata.directorEmail },
        { label: "Weekend Hours", value: companydata.weekendHours }
      ]
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80')`
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
          {/* Hero Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 rounded-full px-6 py-3 mb-8"
          >
            <MessageCircle className="text-amber-400 mr-2 h-5 w-5" />
            <span className="text-amber-300 font-medium">Get in Touch with Us</span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 leading-tight"
          >
            <span className="text-white drop-shadow-2xl">Let's Connect &</span>
            <br />
            <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent drop-shadow-lg">
              Transform Together
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-lg md:text-xl text-gray-200 max-w-4xl mx-auto leading-relaxed mb-12 drop-shadow-lg"
          >
            Whether you're seeking educational excellence, partnership opportunities, or need support,
            we're here to help you achieve your goals and unlock your potential.
          </motion.p>

          {/* Quick Contact Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mb-12"
          >
            {[
              { icon: Users, number: "24/7", label: "Support Available" },
              { icon: Clock, number: "< 24h", label: "Response Time" },
              { icon: Globe, number: "50+", label: "Countries Served" },
              { icon: Star, number: "4.9★", label: "Client Rating" }
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

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
          >
            <a
              href="#contact-form"
              className="inline-flex items-center bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-amber-500/50 transition-all duration-300 transform hover:-translate-y-1"
            >
              <Send className="mr-3 h-5 w-5" />
              Start Conversation
              <ChevronDown className="ml-2 h-4 w-4 animate-bounce" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Contact Methods Section */}
      <section className="py-24 bg-gray-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 rounded-full px-6 py-3 mb-8">
              <Phone className="text-amber-600 mr-2 h-5 w-5" />
              <span className="text-amber-700 font-medium">Multiple Ways to Reach Us</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              <span className="text-slate-800">Choose Your</span>{' '}
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Preferred Contact Method
              </span>
            </h2>

            <p className="max-w-3xl mx-auto text-xl text-slate-600 leading-relaxed">
              We offer various channels to ensure you can reach us in the most convenient way for your needs
            </p>
          </motion.div>

          {/* Contact Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {contactMethods.map((method, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative"
              >
                {/* Glow Effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100"></div>

                {/* Main Card */}
                <div className="relative bg-white backdrop-blur-sm border border-gray-200 rounded-3xl p-8 h-full hover:bg-gray-50 transition-all duration-500 group-hover:scale-105 shadow-lg hover:shadow-xl">
                  {/* Icon */}
                  <div className="mb-6">
                    <div className={`w-16 h-16 bg-gradient-to-br ${method.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                      <method.icon className="h-8 w-8 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-slate-800 group-hover:text-amber-600 transition-colors duration-300">
                      {method.title}
                    </h3>

                    <div className="space-y-3">
                      {method.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex justify-between items-start">
                          <span className="text-sm font-medium text-slate-600">{item.label}:</span>
                          <span className="text-sm text-slate-800 font-semibold text-right max-w-xs break-words">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact-form" className="py-32 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-tr from-teal-500/5 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-white/10 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-white/20 shadow-2xl"
          >
            {/* Form Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 rounded-full px-6 py-3 mb-6">
                <Send className="text-amber-400 mr-2 h-5 w-5" />
                <span className="text-amber-300 font-medium">Send us a Message</span>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                Fill out the form below and we'll get back to you within 24 hours with personalized assistance
              </p>
            </div>

            {/* Contact Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Name Field */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 group-focus-within:text-amber-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Your Full Name"
                    className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  />
                </div>

                {/* Email Field */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Your Email Address"
                    className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="Your Phone Number"
                  className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                />
              </div>

              {/* Message Field */}
              <div className="relative group">
                <div className="absolute top-4 left-4 pointer-events-none">
                  <MessageSquare className="h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder="Tell us about your inquiry, goals, or how we can help you..."
                  className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
                />
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Send className="mr-3 h-5 w-5" />
                    Send Message
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Enhanced FAQ Section */}
      <section className="py-32 bg-gradient-to-br from-white via-amber-50 to-yellow-50 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 rounded-full px-6 py-3 mb-8">
              <MessageCircle className="text-amber-600 mr-2 h-5 w-5" />
              <span className="text-amber-700 font-medium">Frequently Asked Questions</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              <span className="text-slate-800">Got Questions?</span>{' '}
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                We've Got Answers
              </span>
            </h2>

            <p className="max-w-3xl mx-auto text-xl text-slate-600 leading-relaxed">
              Find quick answers to the most commonly asked questions about our programs, support, and services
            </p>
          </motion.div>

          {/* FAQ Accordion */}
          <div className="grid md:grid-cols-2 gap-6">
            {faqData.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 rounded-2xl transition-colors duration-300"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-xl">
                      <faq.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 flex-1">
                      {faq.question}
                    </h3>
                  </div>
                  <div className="ml-4">
                    {activeAccordion === index ? (
                      <ChevronUp className="h-6 w-6 text-amber-600 transition-transform duration-300" />
                    ) : (
                      <ChevronDown className="h-6 w-6 text-slate-400 transition-transform duration-300" />
                    )}
                  </div>
                </button>

                <motion.div
                  initial={false}
                  animate={{
                    height: activeAccordion === index ? "auto" : 0,
                    opacity: activeAccordion === index ? 1 : 0
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6">
                    <div className="ml-16 text-slate-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Media & Connect Section */}
      <section className="py-24 bg-gradient-to-r from-slate-800 to-slate-900 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Stay Connected With Us
            </h2>

            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Follow us on social media for the latest updates, educational insights, success stories, and community news
            </p>

            <div className="flex justify-center items-center gap-4 mb-6 flex-wrap">
              {[
                { icon: FaFacebook, color: "hover:bg-blue-600", label: "Facebook" },
                { icon: FaTwitter, color: "hover:bg-blue-400", label: "Twitter" },
                { icon: FaLinkedin, color: "hover:bg-blue-700", label: "LinkedIn" },
                { icon: FaInstagram, color: "hover:bg-pink-600", label: "Instagram" },
                { icon: FaYoutube, color: "hover:bg-red-600", label: "YouTube" },
                { icon: FaWhatsapp, color: "hover:bg-orange-600", label: "WhatsApp" }
              ].map((social, index) => (
                <motion.a
                  key={index}
                  href="#"
                  whileHover={{ scale: 1.1, y: -2 }}
                  className={`w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white ${social.color} transition-all duration-300 shadow-lg border border-white/20`}
                  title={social.label}
                >
                  <social.icon size={24} />
                </motion.a>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-white/20">
              {[
                { number: "50K+", label: "Followers" },
                { number: "1M+", label: "Reach" },
                { number: "Daily", label: "Updates" },
                { number: "24/7", label: "Response" }
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl font-bold text-white">{stat.number}</div>
                  <div className="text-gray-400 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ContactUs;