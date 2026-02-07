import { useState } from "react";
import { useNavigate } from "react-router-dom";
import vid from '/vid.mp4';
import { MessageCircle } from 'lucide-react';
import ConnectWithUsModal from './ConnectWithUsModal';

// Course Details Modal Component
const CourseDetailsModal = ({ course, onClose, onEnquiry }) => {
  if (!course) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-gray-800 shadow-2xl"
        style={{
          animation: "scale-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
        }}
      >
        <style jsx>{`
          @keyframes scale-up {
            0% { transform: scale(0.8); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes slide-in {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}</style>
        
        <div className="relative">
          {/* Hero section with course image and overlay */}
          <div className="relative h-72 overflow-hidden rounded-t-2xl">
            <img 
              src={course.image} 
              alt={course.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            
            {/* Decorative elements */}
            <div className="absolute top-4 right-4 bg-white bg-opacity-20 backdrop-blur-md rounded-full p-1.5">
              <div className="bg-black rounded-full h-8 w-8 flex items-center justify-center text-white font-bold text-sm">
                {course.rating}
              </div>
            </div>
            
            <div className="absolute bottom-4 left-6 text-white">
              <h2 className="text-3xl font-extrabold text-white mb-2 drop-shadow-md">{course.title}</h2>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <span>{course.rating} Rating</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>{course.students} Students</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{course.duration}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Close button */}
          <button 
            onClick={onClose} 
            className="absolute top-4 left-4 bg-white bg-opacity-30 backdrop-blur-md p-2 rounded-full hover:bg-opacity-50 transition-all duration-300 text-white z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
  <div className="p-8 bg-gray-50">
          {/* Course main content */}
          <div className="space-y-6" style={{ animation: "slide-in 0.5s ease forwards 0.2s", opacity: 0 }}>
            {/* Price badge */}
                <div className="inline-block px-4 py-2 bg-black text-white font-bold rounded-lg shadow-md">
                  {course.price} <span className="text-gray-400 text-sm font-normal">/ {course.duration}</span>
                </div>
            
            {/* Description */}
            <div>
              <h3 className="text-xl font-bold text-black mb-3">About This Course</h3>
              <p className="text-gray-700 leading-relaxed">{course.description}</p>
            </div>
            
            {/* Info grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="bg-gray-100 p-6 rounded-xl border border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300">
                <h3 className="font-bold text-black text-lg mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Course Features
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-gray-800">
                    <svg className="w-5 h-5 text-gray-800 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Live Interactive Sessions</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-800">
                    <svg className="w-5 h-5 text-gray-800 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Practice Materials</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-800">
                    <svg className="w-5 h-5 text-gray-800 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Progress Tracking</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-800">
                    <svg className="w-5 h-5 text-gray-800 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Certificate on Completion</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-100 p-6 rounded-xl border border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-300">
                <h3 className="font-bold text-black text-lg mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  What You'll Learn
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-gray-800">
                    <svg className="w-5 h-5 text-gray-800 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Practical Communication Skills</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-800">
                    <svg className="w-5 h-5 text-gray-800 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Grammar & Vocabulary</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-800">
                    <svg className="w-5 h-5 text-gray-800 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Pronunciation & Fluency</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-800">
                    <svg className="w-5 h-5 text-gray-800 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Real-world Applications</span>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Additional info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-700">
                <h4 className="text-black font-semibold">Level</h4>
                <h4 className="text-black font-semibold">Duration</h4>
                <p className="text-gray-700">{course.level}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-700">
                <h4 className="text-black font-semibold">Duration</h4>
                <p className="text-gray-700">{course.duration}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-700">
                <h4 className="text-black font-semibold">Schedule</h4>
                <p className="text-gray-700">{course.schedule}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-700">
                <h4 className="text-black font-semibold">Students</h4>
                <p className="text-gray-700">{course.students}</p>
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="mt-8 flex flex-wrap gap-4 justify-end" style={{ animation: "slide-in 0.5s ease forwards 0.4s", opacity: 0 }}>
            <button onClick={onClose} className="px-6 py-3 rounded-xl text-white font-semibold bg-black hover:bg-gray-800 transition-colors duration-300 border border-black">
              Close
            </button>
            <button onClick={onEnquiry} className="px-6 py-3 bg-gradient-to-r from-[#988913] to-[#c5a32e] hover:from-[#c5a32e] hover:to-[#988913] text-white font-bold rounded-xl shadow-lg transform transition-all duration-300 hover:translate-y-[-2px] flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Enquiry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Courses = () => {
  const navigate = useNavigate();
  const [videoPoster, setVideoPoster] = useState(vid); // Using imported vid as the source for the video
  const [scheduleLink, setScheduleLink] = useState("#schedule-class");
  const [liveLink, setLiveLink] = useState("#join-live-class");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);

  const scheduleClasses = [
    {
      id: 1,
      subject: "Spoken English Mastery",
      description: "Live demo class to improve fluency, pronunciation, and confidence in English conversations.",
      teacher: "Ms. Johnson",
      time: "10:00 AM",
      duration: "90 mins",
      icon: null,
      videoSrc: "/vid2.mp4",
    },
    {
      id: 2,
      subject: "English Grammar Essentials",
      description: "Step-by-step grammar modules and practical exercises to perfect your English structure.",
      teacher: "Mr. Smith",
      time: "2:00 PM",
      duration: "75 mins",
      icon: null,
      videoSrc: "/vid2.mp4",
    },
    {
      id: 3,
      subject: "IELTS Preparation",
      description: "Mock tests, tips, and personalized feedback for international English exams. Improve your band score!",
      teacher: "Ms. Patel",
      time: "4:00 PM",
      duration: "120 mins",
      icon: null,
      videoSrc: "/vid2.mp4",
    },
    {
      id: 4,
      subject: "Business Communication",
      description: "Master professional email writing, presentations and business negotiations in English.",
      teacher: "Dr. Anderson",
      time: "1:30 PM",
      duration: "90 mins",
      icon: null,
      videoSrc: "/vid2.mp4",
    },
    {
      id: 5,
      subject: "English for Interviews",
      description: "Practical interview preparation with mock sessions and feedback from industry experts.",
      teacher: "Mr. Wilson",
      time: "11:00 AM",
      duration: "60 mins",
      icon: null,
      videoSrc: "/vid2.mp4",
    },
  ];

  const liveClasses = [
    {
      id: 1,
      subject: "Conversational English",
      description: "Live demo class to build confidence in everyday English conversations with native speakers.",
      teacher: "Mr. Brown",
      time: "11:00 AM",
      duration: "90 mins",
      icon: null,
      videoSrc: "/vid1.mp4",
    },
    {
      id: 2,
      subject: "English for Kids - Fun Class",
      description: "Engaging activities and games to build strong English foundations for children ages 8-12.",
      teacher: "Ms. orange",
      time: "3:00 PM",
      duration: "60 mins",
      icon: null,
      videoSrc: "/vid1.mp4",
    },
    {
      id: 3,
      subject: "Advanced English Literature",
      description: "Explore classic and modern literature, improve reading comprehension and critical analysis.",
      teacher: "Dr. White",
      time: "5:00 PM",
      duration: "120 mins",
      icon: null,
      videoSrc: "/vid1.mp4",
    },
    {
      id: 4,
      subject: "Accent Reduction Workshop",
      description: "Master neutral English pronunciation and reduce accent with specialized techniques.",
      teacher: "Ms. Davis",
      time: "6:30 PM",
      duration: "75 mins",
      icon: null,
      videoSrc: "/vid1.mp4",
    },
    {
      id: 5,
      subject: "Public Speaking Masterclass",
      description: "Overcome stage fear and deliver powerful speeches in English with confidence.",
      teacher: "Mr. Thompson",
      time: "9:00 AM",
      duration: "60 mins",
      icon: null,
      videoSrc: "/vid1.mp4",
    },
  ];

  // State for course data - an array of course objects
  const [courses, setCourses] = useState([
    {
      id: 1,
      title: "Spoken English Mastery",
      description: "Interactive live sessions to improve fluency, pronunciation, and confidence in English.",
      image: "/se.jpg",
      link: "#course-spoken-english",
      duration: "3 months",
      level: "Beginner to Advanced",
      schedule: "Flexible Timings",
      price: "$199",
      students: "1000+",
      rating: 4.8
    },
    {
      id: 2,
      title: "English Grammar Essentials",
      description: "Step-by-step grammar modules and practical exercises.",
      image: "/eg.jpg",
      link: "#course-grammar",
      duration: "2 months",
      level: "Beginner",
      schedule: "Weekdays, 6 PM - 8 PM",
      price: "$149",
      students: "500+",
      rating: 4.7
    },
    {
      id: 3,
      title: "IELTS Preparation",
      description: "Mock tests, tips, and personalized feedback for international English exams.",
      image: "/iel.jpg",
      link: "#course-ielts",
      duration: "1.5 months",
      level: "Intermediate to Advanced",
      schedule: "Saturdays, 10 AM - 1 PM",
      price: "$249",
      students: "800+",
      rating: 4.9
    },
    {
      id: 4,
      title: "Business English Communication",
      description: "Professional communication, email writing, and presentation skills for workplace success.",
      image: "/be.jpg",
      link: "#course-business-english",
      duration: "2 months",
      level: "All Levels",
      schedule: "Flexible Timings",
      price: "$199",
      students: "600+",
      rating: 4.8
    },
    {
      id: 5,
      title: "English for Kids",
      description: "Fun and engaging classes for children to build strong English foundations.",
      image: "/ek.jpg",
      link: "#course-kids",
      duration: "3 months",
      level: "Beginner",
      schedule: "Weekends, 10 AM - 12 PM",
      price: "$129",
      students: "300+",
      rating: 4.6
    },
    {
      id: 6,
      title: "Advanced English Literature",
      description: "Explore classic and modern literature, improve reading comprehension, and develop critical thinking skills.",
      image: "/se.jpg",
      link: "#course-literature",
      duration: "2.5 months",
      level: "Advanced",
      schedule: "Thursdays, 6 PM - 9 PM",
      price: "$199",
      students: "400+",
      rating: 4.7
    },
  ]);

  // Function to handle media error (e.g., if image/video source is broken)
  const handleMediaError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src =
      "https://placehold.co/1280x720/CCCCCC/333333?text=Media+Unavailable";
    if (e.currentTarget.tagName === "VIDEO") {
      e.currentTarget.poster =
        "https://placehold.co/1280x720/CCCCCC/333333?text=Video+Unavailable";
    }
  };

  const [scheduleIndex, setScheduleIndex] = useState(0);
  const [liveIndex, setLiveIndex] = useState(0);
  // Function to handle image error for course cards
  const handleImageError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src =
      "https://placehold.co/400x250/CCCCCC/333333?text=Image+Error";
  };
  const handleScheduleSlide = (direction) => {
    if (direction === 1) {
      setScheduleIndex((prev) => (prev + 1) % scheduleClasses.length);
    } else {
      setScheduleIndex(
        (prev) => (prev - 1 + scheduleClasses.length) % scheduleClasses.length
      );
    }
  };

  const handleLiveSlide = (direction) => {
    if (direction === 1) {
      setLiveIndex((prev) => (prev + 1) % liveClasses.length);
    } else {
      setLiveIndex(
        (prev) => (prev - 1 + liveClasses.length) % liveClasses.length
      );
    }
  };

  const ClassCard = ({ classData, isLive = false }) => (
    <div className="w-full flex-shrink-0 p-1">
      <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden h-full border-2 border-gray-300 hover:border-black transition-all duration-300 transform hover:scale-105 hover:shadow-2xl group">
        {/* Card shine effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out opacity-30"></div>
        </div>
        
        {/* Header with background video */}
        <div
          className={`h-32 sm:h-44 bg-gradient-to-r from-gray-200 to-gray-100 flex items-center justify-center relative overflow-hidden`}
        >
          <video
            src={isLive ? "/vid1.mp4" : "/vid2.mp4"}
            autoPlay
            muted
            loop
            className="absolute inset-0 w-full h-full object-cover"
            style={{ background: "none" }}
          />
          
          {/* Video overlay */}
          <video
            src={isLive ? "/vid1.mp4" : "/vid2.mp4"}
            autoPlay
            muted
            loop
            className="absolute inset-0 w-full h-full object-cover group-hover:opacity-80 transition-opacity duration-300"
            style={{ background: "none" }}
          />
          
          {/* Live badge */}
          {isLive && (
            <div className="absolute top-3 right-3  text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 z-10 animate-pulse">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-"></span>
              </span>
              LIVE NOW
            </div>
          )}
          
          {/* Decorative shapes */}
          <div className="absolute -bottom-6 -left-6 w-12 h-12 rounded-full bg-white opacity-10"></div>
          <div className="absolute -top-6 -right-6 w-12 h-12 rounded-full bg-white opacity-10"></div>
          
          {/* Duration badge */}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-xs font-medium z-10 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"></path>
              <path d="M13 7h-2v6h6v-2h-4z"></path>
            </svg>
            {classData.duration || "60 mins"}
          </div>
        </div>
        
        {/* Content area */}
        <div className="p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <h3 className="text-lg md:text-xl font-bold text-black mb-1 group-hover:text-black transition-colors duration-300">
              {classData.subject}
            </h3>
            {isLive && (
              <button
                className="flex-shrink-0 ml-2 bg-red-50 p-1.5 rounded-full hover:bg-red-100 transition-colors duration-300" 
                title="Join Live Class"
                onClick={() => navigate('/live-class', { state: { classData } })}
              >
                <svg
                  className="w-6 h-6 text-red-600 hover:text-red-700 cursor-pointer transition-colors duration-200"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-700 mt-0.5 mb-1">
            <div className="flex items-center bg-gray-200 px-2 py-0.5 rounded-full border border-gray-700">
              <svg className="w-3.5 h-3.5 text-gray-700 mr-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              <span className="font-semibold">4.9</span>
            </div>
            <span>•</span>
            <span className={isLive ? "text-red-500 font-medium" : "text-gray-700 font-medium"}>
              {isLive ? "Live Now" : "Upcoming"}
            </span>
          </div>
          
          <p className="text-sm text-gray-700 mb-2 line-clamp-2 group-hover:line-clamp-none transition-all duration-300">
            {classData.description}
          </p>
          
          <div className="flex justify-between items-center text-sm mb-1 mt-auto">
            <div className="flex items-center bg-gray-200 px-2 py-1 rounded-full shadow-sm border border-gray-700">
              <img 
                src={`https://ui-avatars.com/api/?name=${classData.teacher}&background=random&size=28`} 
                alt={classData.teacher}
                className="w-4 h-4 rounded-full mr-1.5 border border-white"
              />
              <span className="text-gray-700 font-medium text-xs">{classData.teacher}</span>
            </div>
            <span
              className={`font-mono font-bold flex items-center text-sm ${
                isLive ? "text-red-600" : "text-gray-700"
              }`}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {classData.time}
            </span>
          </div>
          
          <button
            className={`mt-2 px-4 py-2 rounded-xl font-bold text-white text-sm shadow-lg transition-all duration-300 transform hover:translate-y-[-2px] flex items-center justify-center gap-2 relative overflow-hidden ${
              isLive 
                ? "bg-black hover:bg-gray-800" 
                : "bg-black hover:bg-gray-800"
            }`}
            onClick={isLive ? () => { window.scrollTo({ top: 0, behavior: 'instant' }); navigate('/live-class'); } : undefined}
            aria-label={isLive ? "Join Live Class" : "Book Demo"}
          >
            {/* Button shine effect */}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent skew-x-15 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out opacity-30"></span>
            
            {isLive ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Join Live Class Now
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Book Free Demo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center bg-white font-inter mt-12 mb-8">
      {/* Headline Section */}
      <div className="w-full max-w-5xl mx-auto text-center mb-16 px-4">
        <div className="relative">
          {/* Decorative elements */}
          <div className="absolute -top-16 left-10 w-32 h-32 bg-gray-200 rounded-full opacity-50 blur-xl"></div>
          <div className="absolute top-10 right-10 w-28 h-28 bg-gray-200 rounded-full opacity-40 blur-xl"></div>
          <div className="absolute bottom-0 left-1/4 w-20 h-20 bg-gray-200 rounded-full opacity-60 blur-lg"></div>
          
          {/* Animated badge */}
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-sm font-bold px-4 py-1 rounded-full shadow-lg">
            <span className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              Popular English Courses
            </span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6 relative">
            <span className="inline-block relative">
              <span className="bg-gradient-to-r from-black to-gray-800 bg-clip-text text-transparent drop-shadow-sm">Explore</span>
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-black to-gray-800 transform scale-x-100 transition-transform duration-500"></div>
            </span>{" "}
            <span className="text-black">Our Premium</span> <br className="md:hidden" />
            <span className="text-black">English Courses</span> & <span className="text-black">Live Classes</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-700 font-medium relative z-10 max-w-3xl mx-auto mb-8 leading-relaxed">
            Learn from expert instructors, join interactive language sessions, and boost your career with our specialized English language courses.
          </p>
          
          {/* Action buttons */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <button 
              onClick={() => setIsEnquiryModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#988913] to-[#c5a32e] hover:from-[#c5a32e] hover:to-[#988913] text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 flex items-center gap-2"
            >
              <MessageCircle className="h-5 w-5" />
              Enquiry
            </button>
          </div>
          
          {/* Decorative floating shapes */}
          <div className="absolute bottom-8 left-10 w-8 h-8 border-4 border-gray-300 rounded-full opacity-70 animate-bounce-slow"></div>
          <div className="absolute -bottom-2 right-16 w-10 h-10 border-4 border-dashed border-gray-400 rounded-lg opacity-60 animate-pulse"></div>
        </div>
      </div>

      {/* Schedule + Live Section in same row */}
      <div className="flex flex-col sm:flex-row gap-6 w-full justify-center items-stretch px-4 sm:px-6 md:px-10 lg:px-14 mb-10">
        {/* Decorative elements */}
        <div className="absolute left-0 w-24 h-24 bg-gray-200 rounded-full opacity-40 blur-xl"></div>
        <div className="absolute right-20 w-32 h-32 bg-gray-200 rounded-full opacity-30 blur-xl"></div>
        
        {/* Schedule Section */}
        <div className="flex flex-col w-full sm:w-2/5 md:w-5/12 lg:w-5/12 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-black to-gray-800 rounded-3xl blur-md opacity-75 group-hover:opacity-100 transition duration-300"></div>
          
          {/* Section header with icon and badge */}
          <h2 className="relative w-full px-4 py-4 bg-gradient-to-r from-black to-gray-800 text-white text-xl md:text-2xl font-bold rounded-t-3xl shadow-lg text-center flex items-center justify-center gap-2">
            <div></div>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="relative">
              Schedule Free Demo Class
              <div className="absolute bottom-[-4px] left-0 right-0 h-[2px] bg-white"></div>
            </span>
          </h2>
          
          {/* Card content area */}
          <div className="relative w-full p-5 bg-gray-100 rounded-b-3xl shadow-xl border-2 border-gray-700">
            {/* Decorative elements */}
            <div className="absolute top-4 left-4 w-16 h-16 border-4 border-dotted border-gray-700 rounded-full opacity-20 -z-10"></div>
            <div className="absolute top-4 left-4 w-16 h-16 border-4 border-dotted border-gray-700 rounded-full opacity-20 -z-10"></div>
            <div className="absolute bottom-8 right-8 w-20 h-20 border-4 border-dashed border-gray-700 rounded-lg opacity-20 rotate-12 -z-10"></div>
            
            {/* Carousel area */}
            <div className="overflow-hidden rounded-xl">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${scheduleIndex * 100}%)` }}
              >
                {scheduleClasses.map((classData) => (
                  <ClassCard
                    key={classData.id}
                    classData={classData}
                    isLive={false}
                  />
                ))}
              </div>
            </div>
            
            {/* Navigation buttons with enhanced styling */}
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => handleScheduleSlide(-1)}
                className="px-6 py-3 bg-black text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <button
                onClick={() => handleScheduleSlide(1)}
                className="px-6 py-3 bg-black text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 flex items-center gap-2"
              >
                Next
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {/* Session counter */}
            <div className="flex justify-center mt-4">
              {Array.from({ length: scheduleClasses.length }).map((_, idx) => (
                <div 
                  key={idx} 
                  className={`w-2 h-2 mx-1 rounded-full ${scheduleIndex === idx ? 'bg-black' : 'bg-black/40'}`}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Section */}
        <div className="flex flex-col w-full sm:w-2/5 md:w-5/12 lg:w-5/12 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-black to-gray-800 rounded-3xl blur-md opacity-75 group-hover:opacity-100 transition duration-300"></div>
          
          {/* Section header with enhanced styling */}
          <h2 className="relative w-full px-4 py-4 bg-gradient-to-r from-black to-gray-800 text-white text-xl md:text-2xl font-bold rounded-t-3xl shadow-lg text-center flex items-center justify-center gap-2">
            <div>
            </div>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="relative">
              Join Live Free Demo Class
              <div className="absolute bottom-[-4px] left-0 right-0 h-[2px] bg-white"></div>
            </span>
            <span className="animate-pulse bg-white text-black text-xs px-3 py-1 rounded-full font-bold ml-2 shadow-inner">LIVE</span>
          </h2>
          
          {/* Card content area */}
          <div className="relative w-full p-5 bg-gray-100 rounded-b-3xl shadow-xl border-2 border-gray-700">
            {/* Decorative elements */}
            <div className="absolute top-10 right-6 w-14 h-14 border-4 border-dotted border-gray-700 rounded-full opacity-20 -z-10"></div>
            <div className="absolute bottom-12 left-10 w-20 h-20 border-4 border-dashed border-gray-700 rounded-lg opacity-20 -rotate-12 -z-10"></div>
            
            {/* Carousel area */}
            <div className="overflow-hidden rounded-xl">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${liveIndex * 100}%)` }}
              >
                {liveClasses.map((classData) => (
                  <ClassCard
                    key={classData.id}
                    classData={classData}
                    isLive={true}
                  />
                ))}
              </div>
            </div>
            
            {/* Navigation buttons with enhanced styling */}
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => handleLiveSlide(-1)}
                className="px-6 py-3 bg-gradient-to-r from-black to-black text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <button
                onClick={() => handleLiveSlide(1)}
                className="px-6 py-3 bg-gradient-to-r from-black to-black text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 flex items-center gap-2"
              >
                Next
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {/* Session counter */}
            <div className="flex justify-center mt-4">
              {Array.from({ length: liveClasses.length }).map((_, idx) => (
                <div 
                  key={idx} 
                  className={`w-2 h-2 mx-1 rounded-full ${liveIndex === idx ? 'bg-black' : 'bg-gray-300'}`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Demo Class Video Section - Flat Two-Color Design */}
      <div className="w-11/12 max-w-5xl mx-auto mt-20 mb-24 relative">
        {/* Background decorative elements */}
        <div className="absolute -top-16 -right-10 w-48 h-48 bg-gray-200 rounded-full opacity-40"></div>
        <div className="absolute -bottom-20 -left-10 w-56 h-56 bg-gray-200 rounded-full opacity-40"></div>
        {/* Decorative patterns */}
        <div className="absolute top-1/4 left-1/4 w-16 h-16 border-4 border-dotted border-gray-700 rounded-full opacity-30"></div>
        <div className="absolute bottom-1/3 right-1/4 w-12 h-12 border-4 border-dashed border-gray-700 rounded-lg opacity-30"></div>
        {/* Main content card - Flat, no shadow/gradient */}
        <div className="relative bg-gray-100 rounded-2xl overflow-hidden border-2 border-gray-700">
          {/* Top accent border */}
          <div className="h-2 bg-black"></div>
          {/* Content wrapper */}
          <div className="flex flex-col md:flex-row items-center">
            {/* Left: Content Section */}
            <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col gap-6 relative">
              {/* Background texture */}
              {/* Subtle background pattern for texture */}
              <div className="absolute inset-0 opacity-5" style={{ background: '#F5F5F5' }}></div>
              {/* Header with decorative elements */}
              <div className="relative">
                <div className="absolute -top-4 -left-4 w-10 h-10 border-t-4 border-l-4 border-gray-700 rounded-tl-lg"></div>
                <h2 className="text-3xl md:text-4xl font-extrabold mb-2 text-black">
                  <span className="text-black">Experience</span> <span className="text-black">Our</span> <br />
                  <span className="text-black">Live Demo Class!</span>
                </h2>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-gray-700 rounded-br-lg"></div>
              </div>
              <p className="text-gray-700 text-lg leading-relaxed relative bg-white rounded-xl px-4 py-2">
                Join our interactive demo class and see how our expert trainers help you improve your English skills with real-time practice, engaging activities, and personalized feedback.
              </p>
              {/* Feature list with enhanced styling */}
              <div className="space-y-5 relative">
                {/* Decorative vertical line */}
                <div className="absolute -left-6 top-1/2 transform -translate-y-1/2 w-2 h-32 bg-black rounded-full opacity-70"></div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white border border-gray-700 flex items-center justify-center mt-1">
                      <span className="text-2xl">💬</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-black mb-0.5">Live Q&A Sessions</h4>
                      <p className="text-gray-700">Ask questions and get immediate answers from our expert trainers</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white border border-gray-700 flex items-center justify-center mt-1">
                      <span className="text-2xl">👥</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-black mb-0.5">Interactive Learning</h4>
                      <p className="text-gray-700">Engage with other students through guided conversation practice</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white border border-gray-700 flex items-center justify-center mt-1">
                      <span className="text-2xl">🎯</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-black mb-0.5">Practical Activities</h4>
                      <p className="text-gray-700">Real-world speaking exercises to build your confidence and fluency</p>
                    </div>
                  </li>
                </ul>
              </div>
              {/* CTA button with enhanced styling */}
              <button
                className="w-fit mt-6 px-8 py-4 bg-black text-white font-bold rounded-xl border-2 border-black flex items-center gap-2"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Book Your Free Demo Now
              </button>
            </div>
            {/* Right: Video Section */}
            <div className="w-full md:w-1/2 p-6 md:p-10 relative">
              {/* Decorative elements */}
              <div className="absolute top-6 right-6 w-20 h-20 border-4 border-dashed border-gray-700 rounded-full opacity-20"></div>
              {/* Video container - Flat, no shadow/gradient */}
              <div className="relative rounded-2xl overflow-hidden border-8 border-white bg-white">
                {/* Video player */}
                <video
                  controls
                  muted
                  className="w-full h-full rounded-xl object-cover bg-gray-100"
                  onError={handleMediaError}
                  aria-label="Demo Class Video"
                  poster="/demo-poster.jpg"
                >
                  <source src={videoPoster} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center p-1 border-2 border-gray-700">
                    <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center">
                      <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
                {/* Video details badge */}
                <div className="absolute bottom-4 right-4 bg-black text-white text-sm px-4 py-2 rounded-full flex items-center gap-2 border-2 border-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">10:25</span>
                </div>
                {/* Top-right quality badge */}
                <div className="absolute top-4 right-4 bg-gray-100 text-black text-xs px-3 py-1 rounded-full font-bold border-2 border-black">
                  HD Quality
                </div>
              </div>
              {/* Video info tags */}
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                <span className="bg-gray-100 text-black text-xs px-3 py-1 rounded-full font-medium border border-gray-700">
                  Beginner Friendly
                </span>
                <span className="bg-gray-100 text-black text-xs px-3 py-1 rounded-full font-medium border border-gray-700">
                  English Speaking
                </span>
                <span className="bg-gray-100 text-black text-xs px-3 py-1 rounded-full font-medium border border-gray-700">
                  Live Interactive
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Grid Section - Flat Two-Color Design */}
      <div className="w-full max-w-6xl mx-auto my-14 p-6 md:p-10 bg-gray-100 rounded-2xl border-2 border-gray-700 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gray-200 rounded-full opacity-40"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gray-200 rounded-full opacity-40"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-1/2 bg-gray-200 rounded-full opacity-20"></div>
        {/* Floating decorative elements */}
        <div className="absolute top-20 right-20 w-12 h-12 border-2 border-dotted border-gray-700 rounded-full opacity-30"></div>
        <div className="absolute bottom-40 left-16 w-10 h-10 border-2 border-dashed border-gray-700 rounded-lg opacity-30 rotate-12"></div>
        <div className="absolute top-1/3 left-1/4 w-16 h-1 bg-gray-700 rounded-full opacity-40 rotate-45"></div>
        <div className="absolute bottom-1/4 right-1/3 w-16 h-1 bg-gray-700 rounded-full opacity-40 -rotate-45"></div>
        <div className="relative">
          {/* Section heading with decorative elements */}
          <div className="relative max-w-lg mx-auto mb-8">
            <div className="absolute -top-4 -left-4 w-10 h-10 border-t-2 border-l-2 border-gray-700 rounded-tl-lg opacity-70"></div>
            <div className="absolute -bottom-4 -right-4 w-10 h-10 border-b-2 border-r-2 border-gray-700 rounded-br-lg opacity-70"></div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-center leading-tight text-black">
              <span className="text-black">Explore</span>{" "}
              <span className="text-black">Our Popular Courses</span>
              <div className="w-24 h-1.5 bg-black mx-auto mt-3 rounded-full"></div>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {courses.map((course, index) => (
              <div
                key={course.id}
                onClick={() => setSelectedCourse(course)}
                className="group relative flex flex-col rounded-xl overflow-hidden cursor-pointer transform transition-all duration-500 hover:-translate-y-2 max-w-xs mx-auto border-2 border-gray-700 bg-white"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Main card content - Flat, no shadow/gradient */}
                <div className="relative flex flex-col h-full bg-white rounded-xl overflow-hidden border-2 border-gray-700">
                  {/* Image section */}
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 border-b-2 border-gray-700"
                      onError={handleImageError}
                    />
                    {/* Price badge */}
                    <div className="absolute top-2 right-2 bg-gray-100 px-2 py-1 rounded-full text-xs font-bold text-black border border-gray-700">
                      {course.price}
                    </div>
                    {/* Duration badge */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black text-white text-xs px-2 py-1 rounded-full border border-gray-300">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {course.duration}
                    </div>
                  </div>
                  {/* Content section */}
                  <div className="flex-1 p-3 flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-black border border-gray-700">
                        {course.level}
                      </div>
                      <div className="flex items-center text-black">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                        <span className="ml-1 text-xs font-semibold">{course.rating}</span>
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-black mb-1 group-hover:text-black transition-colors duration-300 line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-gray-700 text-xs flex-grow mb-2 line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-1 text-xs text-gray-700">
                        <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        {course.students}
                      </div>
                      <span className="inline-flex items-center text-black font-medium text-xs group-hover:font-semibold transition-all duration-300">
                        Details
                        <svg className="w-3 h-3 ml-1 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Action button with enhanced styling */}
          <div className="mt-10 text-center">
            <button className="inline-flex items-center px-6 py-3 bg-black text-white font-bold rounded-lg border-2 border-black transform transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group">
              View All Courses
              <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Course Details Modal */}
      {selectedCourse && (
        <CourseDetailsModal 
          course={selectedCourse} 
          onClose={() => setSelectedCourse(null)}
          onEnquiry={() => {
            setSelectedCourse(null);
            setIsEnquiryModalOpen(true);
          }}
        />
      )}

      {/* Enquiry Modal */}
      <ConnectWithUsModal 
        isOpen={isEnquiryModalOpen} 
        onClose={() => setIsEnquiryModalOpen(false)} 
      />
    </div>
  );
};

export default Courses;