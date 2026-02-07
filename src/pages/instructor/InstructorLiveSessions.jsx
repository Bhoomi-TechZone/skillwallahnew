import React, { useState, useEffect } from 'react';
import { FiVideo, FiCalendar, FiUsers, FiClock, FiPlay, FiSquare } from 'react-icons/fi';

const InstructorLiveSessions = ({ userData }) => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    // Mock data for now - replace with actual API call
    const mockSessions = [
      {
        id: 1,
        title: 'JavaScript Fundamentals',
        course: 'Web Development',
        date: '2026-01-10',
        time: '10:00 AM',
        duration: 60,
        attendees: 25,
        maxAttendees: 50,
        status: 'upcoming',
        meetingLink: 'https://meet.google.com/abc-def-ghi'
      },
      {
        id: 2,
        title: 'React Hooks Deep Dive',
        course: 'React Masterclass',
        date: '2026-01-08',
        time: '2:00 PM',
        duration: 90,
        attendees: 35,
        maxAttendees: 40,
        status: 'completed',
        meetingLink: 'https://meet.google.com/xyz-uvw-rst'
      },
      {
        id: 3,
        title: 'Node.js Backend Development',
        course: 'Full Stack Development',
        date: '2026-01-15',
        time: '3:00 PM',
        duration: 120,
        attendees: 18,
        maxAttendees: 30,
        status: 'upcoming',
        meetingLink: 'https://meet.google.com/mnp-qrs-tuv'
      }
    ];

    setTimeout(() => {
      setSessions(mockSessions);
      setIsLoading(false);
    }, 1000);
  }, []);

  const filteredSessions = sessions.filter(session => {
    if (activeTab === 'upcoming') {
      return session.status === 'upcoming';
    } else if (activeTab === 'completed') {
      return session.status === 'completed';
    }
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'text-blue-600 bg-blue-100';
      case 'live':
        return 'text-red-600 bg-red-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleJoinSession = (session) => {
    window.open(session.meetingLink, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Live Sessions</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Schedule New Session
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 border-b">
        {[
          { key: 'upcoming', label: 'Upcoming', count: sessions.filter(s => s.status === 'upcoming').length },
          { key: 'completed', label: 'Completed', count: sessions.filter(s => s.status === 'completed').length },
          { key: 'all', label: 'All Sessions', count: sessions.length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Sessions Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSessions.map(session => (
          <div key={session.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
                {session.title}
              </h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(session.status)}`}>
                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-3">{session.course}</p>

            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <FiCalendar className="w-4 h-4 mr-2" />
                {session.date}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <FiClock className="w-4 h-4 mr-2" />
                {session.time} ({session.duration} mins)
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <FiUsers className="w-4 h-4 mr-2" />
                {session.attendees}/{session.maxAttendees} attendees
              </div>
            </div>

            <div className="flex space-x-2">
              {session.status === 'upcoming' && (
                <button
                  onClick={() => handleJoinSession(session)}
                  className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  <FiPlay className="w-4 h-4 mr-1" />
                  Join Session
                </button>
              )}
              {session.status === 'completed' && (
                <button className="flex-1 bg-gray-100 text-gray-600 px-3 py-2 rounded text-sm cursor-not-allowed flex items-center justify-center">
                  <FiSquare className="w-4 h-4 mr-1" />
                  Completed
                </button>
              )}
              <button className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors">
                Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredSessions.length === 0 && (
        <div className="text-center py-12">
          <FiVideo className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
          <p className="text-gray-600 mb-4">
            {activeTab === 'upcoming' 
              ? "You don't have any upcoming live sessions scheduled."
              : activeTab === 'completed'
              ? "You haven't completed any live sessions yet."
              : "You don't have any live sessions yet."}
          </p>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Schedule Your First Session
          </button>
        </div>
      )}
    </div>
  );
};

export default InstructorLiveSessions;