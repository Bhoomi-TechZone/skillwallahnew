import React, { useState } from 'react';
import { FaUniversity, FaBuilding, FaChalkboardTeacher, FaUserFriends, FaHandshake, FaLightbulb } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import PartnershipRequestModal from '../components/PartnershipRequestModal';

const opportunities = [
  {
    icon: <FaUniversity className="text-amber-600 text-3xl" />,
    title: 'Colleges & Universities',
    description: 'Collaborate for curriculum, guest lectures, and student upskilling.'
  },
  {
    icon: <FaBuilding className="text-blue-600 text-3xl" />,
    title: 'Companies & Corporates',
    description: 'Corporate training, hiring partnerships, and upskilling programs.'
  },
  {
    icon: <FaChalkboardTeacher className="text-orange-600 text-3xl" />,
    title: 'Trainers & Mentors',
    description: 'Share your expertise and mentor the next generation.'
  },
  {
    icon: <FaUserFriends className="text-pink-600 text-3xl" />,
    title: 'Creators & Influencers',
    description: 'Co-create content, workshops, and reach a wider audience.'
  },
  {
    icon: <FaHandshake className="text-purple-600 text-3xl" />,
    title: 'Franchise Partners',
    description: 'Start a SkillWallah franchise in your city or campus.'
  },
  {
    icon: <FaLightbulb className="text-yellow-500 text-3xl" />,
    title: 'Workshops & Events',
    description: 'Host or sponsor workshops, hackathons, and seminars.'
  }
];

const Partnerships = () => {
  const navigate = useNavigate();
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 py-16 px-4">
      <PartnershipRequestModal isOpen={isPartnerModalOpen} onClose={() => setIsPartnerModalOpen(false)} />
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Explore <span className="text-amber-600">Partnership</span> Opportunities
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Join hands with SkillWallah to empower learners and create impact. We welcome collaborations from all sectors!
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {opportunities.map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-amber-100 hover:shadow-amber-200 transition-all duration-300">
              <div className="mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold text-amber-700 mb-2">{item.title}</h3>
              <p className="text-gray-600 mb-4">{item.description}</p>
              <button
                onClick={() => setIsPartnerModalOpen(true)}
                className="mt-auto bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-semibold py-2 px-6 rounded-lg shadow hover:from-amber-600 hover:to-yellow-700 transition-all duration-300"
              >
                Express Interest
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Partnerships;
