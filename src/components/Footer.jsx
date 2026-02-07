import { motion } from "framer-motion";
import { Facebook, Globe, Instagram, Linkedin, Mail, MapPin, Phone, Twitter, Youtube } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";

const Footer = () => {
  const [hoveredSocial, setHoveredSocial] = useState(null);

  const footerData = {
    company: {
      name: "Skill Wallah EdTech",
      logo: "/LondonLogo.png",
      // secondLogo: "/logo1.png",
      description:
        "SWE is a leading platform for global education and professional development, offering a wide range of courses with British academic heritage and excellence.",
      contact: {
        address: "Registered Office Address:\nA43 Sector 63,\nNoida,\nUttar Pradesh, India.",
        phone: "+91 7454054995",
        email: "info@skillwallahedtech.com",
        website: "www.skillwallahedtech.com"
      },
    },
    sections: [
      // {
      //   title: "Courses",
      //   links: [
      //     { key: "browse", title: "Browse Courses", link: "/browse" },
      //     { key: "category", title: "Course Categories", link: "/category" },
      //     { key: "free-classes", title: "Free Classes", link: "/course" },
      //     { key: "privacy", title: "Privacy Policy", link: "/privacy" },
      //   ],
      // },
      {
        title: "Company",
        links: [
          { key: "about", title: "About Us", link: "/about" },
          { key: "opportunities", title: "Opportunities", link: "/opportunities" },
          // { key: "faq", title: "FAQ", link: "/faq" },
          { key: "contact", title: "Contact Us", link: "/ContactUs" },
          { key: "course-offer", title: "Course we Offer", link: "/courses-offer" },
          { key: "privacy", title: "Privacy Policy", link: "/privacy" },
        ],
      },
      {
        title: "Collaboration",
        links: [
          { key: "partners", title: "Our Partners", link: "/collaboration" },
          { key: "onsite", title: "Onsite Training", link: "/collaboration" },
          { key: "institutional", title: "Institutional Development", link: "/collaboration" },
          { key: "global", title: "Global Network", link: "/partnerships" },
        ],
      },
    ],
    socialMedia: [
      {
        hoverKey: "linkedin",
        name: "LinkedIn",
        icon: <Linkedin className="w-5 h-5" />,
        link: "https://www.linkedin.com/company/londonschoolmc",
      },
      {
        hoverKey: "twitter",
        name: "Twitter",
        icon: <Twitter className="w-5 h-5" />,
        link: "https://www.twitter.com/londonschoolmc",
      },
      {
        hoverKey: "youtube",
        name: "YouTube",
        icon: <Youtube className="w-5 h-5" />,
        link: "https://www.youtube.com/londonschoolmc",
      },
      {
        hoverKey: "facebook",
        name: "Facebook",
        icon: <Facebook className="w-5 h-5" />,
        link: "https://www.facebook.com/londonschoolmc",
      },
      {
        hoverKey: "instagram",
        name: "Instagram",
        icon: <Instagram className="w-5 h-5" />,
        link: "https://www.instagram.com/londonschoolmc",
      },
    ],
    appDownload: {
      title: "Download LMS Mobile Apps for Trainees",
      appStore: {
        link: "https://www.apple.com/app-store/",
        icon: "M10.05 0c-.394 0-.825.214-1.121.432-1.705 1.258-2.671 3.513-2.502 5.922.091 1.343.606 2.531 1.281 3.498.411.59.839 1.157 1.517 1.144.646-.013.916-.588.916-.763 0-1.026.438-1.488 1.455-1.503 1.162-.016 1.996 1.122 3.123 1.122 1.109 0 1.75-.826 2.656-.826 1.05 0 2.222 1.123 3.307 1.123.673 0 1.161-.311 1.161-.836 0-1.112-1.102-1.921-1.102-3.159 0-1.096.792-1.892 1.83-2.88.583-.548.868-.971.868-1.554 0-1.026-1.391-1.411-2.274-1.411-1.259 0-2.28.718-2.909.718-.616 0-1.173-.807-2.316-.807-1.119 0-2.07.694-2.693.694zM16.536 1.84c.703-.896 1.94-.858 2.614-.092.654.735.669 1.942-.058 2.766-.689.78-1.949.805-2.628.08-.66-.718-.654-1.94.072-2.754z",
      },
      googlePlay: {
        link: "https://play.google.com/store/apps/",
        icon: "M1.949 9.324l6.096 6.096 3.159-3.159-9.255-2.937zM18.847 8.78l-3.329-3.329-5.187 5.187 3.329 3.329 5.187-5.187zM1.949 14.676l9.255 2.937 3.159-3.159-6.096-6.096-6.318 6.318zM15.421 1.771L8.5 8.72l-1.373-1.373 7.025-7.025c.189-.189.418-.283.647-.283.228 0 .457.094.647.283l.115.115c.379.379.379 1.002 0 1.382l-7.025 7.025c-.189.189-.418.283-.647.283-.228 0-.457-.094-.647-.283l-7.025-7.025c-.379-.379-.379-1.002 0-1.382l.115-.115c.379-.379 1.002-.379 1.382 0l7.025 7.025 1.373 1.373zM15.5 15.28l1.373 1.373c.189.189.418.283.647.283.228 0 .457-.094.647-.283l7.025-7.025c.379-.379.379-1.002 0-1.382l-.115-.115c-.379-.379-1.002-.379-1.382 0l-7.025 7.025zM17.025 19.141l-1.373 1.373c-.189.189-.418.283-.647.283-.228 0-.457-.094-.647-.283l-7.025-7.025c-.379-.379-.379-1.002 0-1.382l.115-.115c.379-.379 1.002-.379 1.382 0l7.025 7.025z",
      },
    },
  };

  return (
    <footer className="relative bg-gradient-to-r from-amber-50/95 via-yellow-50/95 to-orange-50/95 backdrop-blur-lg text-gray-700 py-10 px-4 md:px-8 border-t border-amber-200/50 overflow-hidden">
      {/* Animated gradient overlay - matching navbar */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/8 via-amber-500/8 to-orange-500/8 animate-gradient-x opacity-60"></div>
      
      {/* Subtle pattern overlay - matching navbar */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(245,158,11,0.2) 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }}
      ></div>
      
      {/* Content container */}
      <div className="relative z-10">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#988913]/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#c5a32e]/5 rounded-full blur-3xl -z-10"></div>
      
      <div className="container mx-auto">
        {/* Logo at the top */}
        <div className="flex items-center justify-left mb-6">
          <img
            src={footerData.company.logo}
            alt={`${footerData.company.name} Logo`}
            className="h-14"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info Section */}
          <motion.div
            className="lg:col-span-1 text-center md:text-left"
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <p className="text-xs text-gray-600 mb-3">
              {footerData.company.description}
            </p>
            <div className="flex space-x-4 mt-6 justify-center md:justify-start">
              {footerData.socialMedia.map((social, index) => (
                <a
                  key={index}
                  href={social.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => setHoveredSocial(social.hoverKey)}
                  onMouseLeave={() => setHoveredSocial(null)}
                  className={`block transition-transform duration-300 transform ${
                    hoveredSocial === social.hoverKey ? "scale-110" : ""
                  }`}
                >
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-[#f9f7f1] to-[#f5f1e6] hover:from-[#988913] hover:to-[#c5a32e] text-[#988913] hover:text-white transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-[#988913]/20 border border-[#e0d5b3] hover:border-[#c5a32e]">
                    {social.icon}
                  </div>
                </a>
              ))}
            </div>
          </motion.div>

          {/* Link Sections */}
          {footerData.sections.map((section, index) => (
            <motion.div
              key={index}
              className="text-center md:text-left"
              initial={{ opacity: 0, x: index % 2 === 0 ? 60 : -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1 * (index + 1) }}
              viewport={{ once: true }}
            >
              <h4 className="text-gray-800 text-base font-semibold mb-3 relative pb-1 inline-block">
                {section.title}
                <span className="absolute bottom-0 left-0 w-1/2 h-0.5 bg-gradient-to-r from-[#988913] to-transparent"></span>
              </h4>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <NavLink
                      to={link.link}
                      className="text-sm text-gray-600 hover:text-[#988913] transition-colors"
                      onClick={() =>
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }
                    >
                      {link.title}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}

          {/* Contact Info Section */}
          <motion.div
            className="text-center md:text-left"
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <h4 className="text-gray-800 text-base font-semibold mb-3 relative pb-1 inline-block">
              Contact
              <span className="absolute bottom-0 left-0 w-1/2 h-0.5 bg-gradient-to-r from-[#988913] to-transparent"></span>
            </h4>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-[#988913] mt-1 flex-shrink-0" />
                <p className="whitespace-pre-line">{footerData.company.contact.address}</p>
              </div>
              {footerData.company.contact.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-[#988913] flex-shrink-0" />
                  <a
                    href={`tel:${footerData.company.contact.phone}`}
                    className="hover:text-[#988913] transition-colors"
                  >
                    {footerData.company.contact.phone}
                  </a>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-[#988913] flex-shrink-0" />
                <a
                  href={`mailto:${footerData.company.contact.email}`}
                  className="hover:text-[#988913] transition-colors"
                >
                  {footerData.company.contact.email}
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-[#988913] flex-shrink-0" />
                <a
                  href={`https://${footerData.company.contact.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#988913] transition-colors"
                >
                  {footerData.company.contact.website}
                </a>
              </div>
            </div>
          </motion.div>
        </div>

        {/* App Download and Copyright Section */}
        <div className="mt-8 pt-6 border-t border-gray-300 text-center">
          {/* <h5 className="text-gray-800 font-semibold mb-3 text-sm flex items-center justify-center">
            <span className="bg-[#988913]/10 p-2 rounded-full mr-3 inline-flex">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#988913]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </span>
            {footerData.appDownload.title}
          </h5> */}
          {/* <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <a
              href={footerData.appDownload.appStore.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-white to-[#f5f1e6] text-gray-700 flex items-center px-6 py-3 rounded-lg hover:from-[#988913]/10 hover:to-[#c5a32e]/20 transition-all duration-300 border border-[#e0d5b3] hover:border-[#988913] shadow-sm hover:shadow-md"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="mr-3 text-[#988913]"
              >
                <path d={footerData.appDownload.appStore.icon} />
              </svg>
              <div>
                <p className="text-xs">Download on the</p>
                <p className="text-sm font-bold mt-1">App Store</p>
              </div>
            </a>
            <a
              href={footerData.appDownload.googlePlay.link}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-white to-[#f5f1e6] text-gray-700 flex items-center px-6 py-3 rounded-lg hover:from-[#988913]/10 hover:to-[#c5a32e]/20 transition-all duration-300 border border-[#e0d5b3] hover:border-[#988913] shadow-sm hover:shadow-md"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="mr-3 text-[#988913]"
              >
                <path d={footerData.appDownload.googlePlay.icon} />
              </svg>
              <div>
                <p className="text-xs">GET IT ON</p>
                <p className="text-sm font-bold mt-1">Google Play</p>
              </div>
            </a>
          </div> */}
          {/* <div className="bg-gradient-to-r from-transparent via-[#988913]/20 to-transparent h-px my-6"></div> */}
          <p className="text-sm text-gray-500 flex flex-col sm:flex-row items-center justify-center gap-2">
            <span>&copy; {new Date().getFullYear()} {footerData.company.name}.</span>
            <span className="hidden sm:inline">|</span>
            <span>All rights reserved.</span>
            <span className="hidden sm:inline">|</span>
            <span>Designed with <span className="text-[#988913]">♥</span> for Excellence in Education</span>
          </p>
        </div>
      </div>
      </div>
    </footer>
  );
};

export default Footer;