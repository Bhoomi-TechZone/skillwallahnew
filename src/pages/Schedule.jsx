import { useState, useEffect } from 'react';
import { FaCalendarAlt, FaSpinner, FaVideo, FaClock, FaUsers, FaLink } from 'react-icons/fa';
import { apiRequest } from '../config/api';

const Schedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [deletingId, setDeletingId] = useState(null); // Track which schedule is being deleted

  // Check if instructor is logged in and token is valid
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuthentication = () => {
      const token = localStorage.getItem('instructorToken');
      
      if (!token) {
        setIsLoggedIn(false);
        setError('Please login as an instructor to view schedules');
        setLoading(false);
        return;
      }

      try {
        // Check if token is expired
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (tokenPayload.exp < currentTime) {
          console.log('Token expired, clearing localStorage');
          localStorage.removeItem('instructorToken');
          localStorage.removeItem('instructorUser');
          setIsLoggedIn(false);
          setError('Session expired. Please login again.');
          setLoading(false);
          return;
        }

        // Token is valid
        setIsLoggedIn(true);
        
        // Get instructor name from localStorage
        const instructorUser = localStorage.getItem('instructorUser');
        if (instructorUser) {
          const userData = JSON.parse(instructorUser);
          setInstructorName(userData.name || 'Instructor');
        }

        // Fetch schedules
        fetchInstructorSchedules();
        
      } catch (error) {
        console.error('Error checking token:', error);
        localStorage.removeItem('instructorToken');
        localStorage.removeItem('instructorUser');
        setIsLoggedIn(false);
        setError('Invalid token. Please login again.');
        setLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  const fetchInstructorSchedules = async () => {
    try {
      const token = localStorage.getItem('instructorToken');
      
      // Debug: Check if token exists and is valid
      if (!token) {
        setError('No authentication token found. Please login again.');
        setLoading(false);
        return;
      }

      // Debug: Check token expiration
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        console.log('Token payload:', tokenPayload);
        console.log('Token expires at:', new Date(tokenPayload.exp * 1000));
        console.log('Current time:', new Date());
        console.log('Token expired:', tokenPayload.exp < currentTime);
        
        if (tokenPayload.exp < currentTime) {
          setError('Session expired. Please login again.');
          localStorage.removeItem('instructorToken');
          localStorage.removeItem('instructorUser');
          setLoading(false);
          return;
        }
      } catch (tokenError) {
        console.error('Error parsing token:', tokenError);
        setError('Invalid token format. Please login again.');
        localStorage.removeItem('instructorToken');
        localStorage.removeItem('instructorUser');
        setLoading(false);
        return;
      }

      console.log('Making request to /instructor/schedules with token:', token.substring(0, 50) + '...');
      
      const response = await apiRequest('/instructor/schedules', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log('Schedules data:', data);
        setSchedules(data);
        setError(''); // Clear any previous errors
      } else {
        const errorData = await response.text();
        console.error('Error response:', errorData);
        
        if (response.status === 401) {
          setError('Session expired or invalid. Please login again.');
          localStorage.removeItem('instructorToken');
          localStorage.removeItem('instructorUser');
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/instructor-dashboard';
          }, 2000);
        } else if (response.status === 403) {
          setError('Access denied. Instructor access required.');
        } else {
          setError(`Failed to fetch schedules (${response.status}): ${errorData}`);
        }
      }
    } catch (error) {
      console.error('Network error fetching schedules:', error);
      setError('Failed to connect to server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const time = new Date();
    time.setHours(hours, minutes);
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (date, time, status = 'scheduled') => {
    const scheduleDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    
    if (status === 'completed') {
      return 'bg-gray-100 text-gray-700';
    } else if (scheduleDateTime < now) {
      return 'bg-red-100 text-red-700';
    } else if (scheduleDateTime <= new Date(now.getTime() + 60 * 60 * 1000)) { // Within 1 hour
      return 'bg-yellow-100 text-yellow-700';
    } else {
      return 'bg-orange-100 text-orange-700';
    }
  };

  const getStatusText = (date, time, status = 'scheduled') => {
    const scheduleDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    
    if (status === 'completed') {
      return 'Completed';
    } else if (scheduleDateTime < now) {
      return 'Missed';
    } else if (scheduleDateTime <= new Date(now.getTime() + 60 * 60 * 1000)) { // Within 1 hour
      return 'Starting Soon';
    } else {
      return 'Scheduled';
    }
  };

  // Delete schedule function
  const handleDeleteSchedule = async (scheduleId, scheduleTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${scheduleTitle}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(scheduleId); // Set loading state for this specific schedule

    try {
      const token = localStorage.getItem('instructorToken');
      
      if (!token) {
        setError('Authentication required. Please login again.');
        setDeletingId(null);
        return;
      }

      console.log('Attempting to delete schedule:', scheduleId);
      console.log('Full schedule object:', schedules.find(s => s.id === scheduleId));

      // Try different possible endpoints
      const possibleEndpoints = [
        `/instructor/schedules/${scheduleId}`,
        `/schedules/${scheduleId}`,
        `/api/schedules/${scheduleId}`,
        `/instructor/live-sessions/${scheduleId}`,
        `/live-sessions/${scheduleId}`
      ];

      let response = null;
      let endpointUsed = '';

      // Try each endpoint until one works
      for (const endpoint of possibleEndpoints) {
        console.log(`Trying endpoint: ${endpoint}`);
        
        try {
          response = await apiRequest(endpoint, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          console.log(`Response from ${endpoint}:`, response.status, response.statusText);
          
          if (response.status !== 404) {
            endpointUsed = endpoint;
            break; // Found working endpoint or got a different error
          }
        } catch (fetchError) {
          console.log(`Network error with ${endpoint}:`, fetchError);
          continue; // Try next endpoint
        }
      }

      if (!response || response.status === 404) {
        console.error('All endpoints returned 404 or failed');
        setError('Delete endpoint not found. The schedule deletion feature may not be implemented yet on the backend.');
        setDeletingId(null);
        return;
      }

      console.log(`Using endpoint: ${endpointUsed}, Status: ${response.status}`);

      if (response.ok) {
        // Remove the deleted schedule from the state
        setSchedules(schedules.filter(schedule => schedule.id !== scheduleId));
        setError(''); // Clear any previous errors
        setSuccessMessage(`"${scheduleTitle}" has been deleted successfully!`);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorData = await response.text();
        console.error('Delete error:', errorData);
        
        if (response.status === 401) {
          setError('Session expired. Please login again.');
          localStorage.removeItem('instructorToken');
          localStorage.removeItem('instructorUser');
        } else if (response.status === 403) {
          setError('Access denied. You can only delete your own schedules.');
        } else if (response.status === 404) {
          setError('Schedule not found. It may have been already deleted.');
          // Remove from local state anyway
          setSchedules(schedules.filter(schedule => schedule.id !== scheduleId));
        } else if (response.status === 405) {
          setError('Delete operation not allowed. The backend may not support schedule deletion yet.');
        } else {
          setError(`Failed to delete schedule (${response.status}): ${errorData}`);
        }
      }
    } catch (error) {
      console.error('Network error deleting schedule:', error);
      setError('Failed to connect to server. Please check your connection.');
    } finally {
      setDeletingId(null); // Clear loading state
    }
  };

  // Edit schedule function
  const handleEditSchedule = (schedule) => {
    // Store the schedule data to edit in localStorage for the edit page
    localStorage.setItem('scheduleToEdit', JSON.stringify(schedule));
    
    // Navigate to the schedule creation page with edit mode
    // You can modify the URL to include edit mode or schedule ID
    window.location.href = `/schedule?edit=${schedule.id}`;
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">Please login as an instructor to view schedules</div>
          <a href="/instructor-dashboard" className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors">
            Go to Login
          </a>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-orange-800 drop-shadow-lg flex items-center gap-3">
            <FaCalendarAlt className="text-orange-600" /> 
            {instructorName ? `${instructorName}'s Classes` : 'My Class Schedule'}
          </h2>
          <div className="flex gap-3">
            <button
              onClick={fetchInstructorSchedules}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <a
              href="/schedule"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold"
            >
              Create New Class
            </a>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-xl mb-6">
            <div className="flex justify-between items-center">
              <div>{successMessage}</div>
              <button
                onClick={() => setSuccessMessage('')}
                className="text-orange-600 hover:text-orange-800 font-bold text-lg"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            <div className="flex justify-between items-center">
              <div>{error}</div>
              {error.includes('login') && (
                <a
                  href="/instructor-dashboard"
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold ml-4"
                >
                  Login
                </a>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <FaSpinner className="animate-spin text-4xl text-orange-600 mx-auto mb-4" />
            <div className="text-gray-600">Loading your scheduled classes...</div>
          </div>
        ) : schedules.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <FaCalendarAlt className="text-6xl text-gray-300 mx-auto mb-4" />
            <div className="text-xl text-gray-600 mb-4">No classes scheduled yet</div>
            <div className="text-gray-500 mb-6">Create your first class schedule to get started</div>
            <a
              href="/schedule"
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
            >
              <FaCalendarAlt />
              Schedule Your First Class
            </a>
          </div>
        ) : (
          /* Schedules Grid */
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="bg-white border border-orange-100 rounded-2xl shadow-lg flex flex-col p-6 hover:shadow-2xl transition-shadow duration-300">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-orange-900 mb-2 line-clamp-2">{schedule.title}</h3>
                    <div className="text-sm text-blue-600 font-medium mb-1">
                      � {schedule.course_name}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(schedule.date, schedule.time, schedule.status)}`}>
                    {getStatusText(schedule.date, schedule.time, schedule.status)}
                  </span>
                </div>

                {/* Schedule Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FaCalendarAlt className="text-orange-500 flex-shrink-0" />
                    <span>{formatDate(schedule.date)} at {formatTime(schedule.time)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FaClock className="text-blue-500 flex-shrink-0" />
                    <span>{schedule.duration} minutes</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FaVideo className="text-purple-500 flex-shrink-0" />
                    <span className="capitalize">{schedule.platform}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FaUsers className="text-orange-500 flex-shrink-0" />
                    <span>Max {schedule.max_students} students</span>
                  </div>
                </div>

                {/* Description */}
                {schedule.description && (
                  <div className="text-sm text-gray-600 mb-4 line-clamp-3 bg-gray-50 p-3 rounded-lg">
                    {schedule.description}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto space-y-2">
                  {schedule.meeting_link && (
                    <a
                      href={schedule.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full block bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition-colors duration-200 text-center"
                    >
                      <FaLink className="inline mr-2" />
                      Join Meeting
                    </a>
                  )}
                  
                  <div className="flex gap-2">
                    <button 
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleEditSchedule(schedule)}
                      disabled={deletingId === schedule.id}
                    >
                      Edit
                    </button>
                    <button 
                      className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 px-3 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => {
                        console.log('Schedule to delete:', schedule);
                        console.log('Schedule ID:', schedule.id);
                        console.log('All schedule keys:', Object.keys(schedule));
                        handleDeleteSchedule(schedule.id, schedule.title);
                      }}
                      disabled={deletingId === schedule.id}
                    >
                      {deletingId === schedule.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <FaSpinner className="animate-spin text-xs" />
                          <span>Deleting...</span>
                        </div>
                      ) : (
                        'Delete'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default Schedule;
