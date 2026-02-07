import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../config/api';
import { supportService } from '../../services/supportService';
import { ticketUpdateService } from '../../services/ticketUpdateService';
import { NotificationManager } from '../../components/TicketNotification';

const StudentSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [activeTab, setActiveTab] = useState('tickets');
  const [ticketFilter, setTicketFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketDetail, setShowTicketDetail] = useState(false);
  const [showAddResponse, setShowAddResponse] = useState(false);

  // Debug function to check localStorage
  const debugLocalStorage = () => {
    console.log('=== LocalStorage Debug Info ===');
    console.log('Available localStorage keys:', Object.keys(localStorage));
    
    const keysToCheck = ['userInfo', 'user', 'currentUser', 'authUser', 'userData', 'token', 'studentToken'];
    keysToCheck.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`${key}:`, value);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          console.log(`${key} (parsed):`, parsed);
          // Log all possible ID fields
          if (parsed) {
            console.log(`  Possible IDs in ${key}:`, {
              id: parsed.id,
              user_id: parsed.user_id,
              userId: parsed.userId,
              _id: parsed._id,
              student_id: parsed.student_id
            });
          }
        } catch (e) {
          console.log(`${key} (parse error):`, e.message);
        }
      }
    });
    console.log('=== End Debug Info ===');
  };

  // Run debug on component mount
  useEffect(() => {
    debugLocalStorage();
    
    // Subscribe to ticket updates
    const unsubscribe = ticketUpdateService.subscribe('StudentSupport', (update) => {
      console.log('Student Support received update:', update);
      
      // Handle different types of updates
      switch (update.type) {
        case 'STATUS_CHANGE':
          // Update the ticket status in local state
          setTickets(prevTickets => 
            prevTickets.map(ticket => 
              ticket.id === update.ticketId || ticket.ticket_number === update.ticketId
                ? { ...ticket, status: update.newStatus, lastUpdate: update.timestamp.split('T')[0] }
                : ticket
            )
          );
          
          // Show notification to user
          console.log(`Your ticket status has been updated to: ${update.newStatus}`);
          
          // Show notification if available
          if (window.showNotification) {
            window.showNotification(
              `Your ticket status has been updated to: ${update.newStatus}`,
              'info',
              5000
            );
          }
          break;
          
        case 'RESPONSE_ADDED':
          // Refresh tickets to get the new response
          // Note: Only refresh if the response was added by admin/support
          if (update.addedBy !== 'student') {
            console.log('New response added by support team, refreshing tickets...');
            // Optionally refresh the specific ticket or all tickets
          }
          break;
          
        default:
          console.log('Unhandled update type:', update.type);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const mockTickets = [
    {
      ticket_number: 'TKT_00404AE8',
      subject: 'Course Access Issue - From Real Student',
      category: 'technical',
      priority: 'high',
      status: 'open',
      course: 'React.js Complete Course',
      createdDate: '2025-09-02',
      lastUpdate: '2025-09-02',
      description: 'I am having trouble accessing my enrolled course. The videos are not loading properly and I get an error when trying to submit assignments.',
      assigned_to: 'Support Team',
      attachment_count: 0,
      responses: [
        {
          id: 1,
          author: 'Support Team',
          message: 'Thank you for reporting this issue. We are investigating the video loading problem and assignment submission error.',
          timestamp: '2025-09-02T14:30:00Z',
          isSupport: true
        }
      ]
    },
    {
      ticket_number: 'TKT_00404AE9',
      subject: 'Grade discrepancy in assignment',
      category: 'academic',
      priority: 'medium',
      status: 'resolved',
      course: 'Node.js Backend Development',
      createdDate: '2025-09-01',
      lastUpdate: '2025-09-02',
      description: 'I believe there might be an error in my assignment grade. I received 75/100 but expected a higher score based on the rubric.',
      assigned_to: 'Academic Team',
      attachment_count: 2,
      responses: [
        {
          id: 1,
          author: 'Dr. Sarah Wilson',
          message: 'I have reviewed your submission and the grading. The score reflects the rubric criteria. I will schedule a call to discuss the feedback.',
          timestamp: '2025-09-01T16:20:00Z',
          isSupport: true
        }
      ]
    },
    {
      ticket_number: 'TKT_00404AF0',
      subject: 'Payment not reflected',
      category: 'billing',
      priority: 'urgent',
      status: 'in_progress',
      course: 'Python for Data Science',
      createdDate: '2025-08-30',
      lastUpdate: '2025-09-02',
      description: 'I made a payment for the Python course but it still shows as unpaid in my account.',
      assigned_to: 'Billing Support',
      attachment_count: 1,
      responses: [
        {
          id: 1,
          author: 'Billing Support',
          message: 'We are verifying your payment with our payment processor. You should receive an update within 24-48 hours.',
          timestamp: '2025-09-01T11:45:00Z',
          isSupport: true
        }
      ]
    }
  ];

  const faqs = [
    {
      id: 1,
      question: 'How do I reset my password?',
      answer: 'You can reset your password by clicking on "Forgot Password" on the login page. You will receive an email with instructions to create a new password.',
      category: 'account'
    },
    {
      id: 2,
      question: 'Can I download course videos?',
      answer: 'Course videos can be downloaded for offline viewing through our mobile app. Desktop downloads are not available due to licensing restrictions.',
      category: 'technical'
    },
    {
      id: 3,
      question: 'How long do I have access to a course?',
      answer: 'Once enrolled, you have lifetime access to the course materials, including any future updates. There are no time restrictions.',
      category: 'course'
    },
    {
      id: 4,
      question: 'Can I get a refund?',
      answer: 'We offer a 30-day money-back guarantee for all courses. If you are not satisfied within 30 days of purchase, you can request a full refund.',
      category: 'billing'
    },
    {
      id: 5,
      question: 'How do I contact my instructor?',
      answer: 'You can contact your instructor through the course discussion forum, direct messaging system, or during live Q&A sessions.',
      category: 'course'
    },
    {
      id: 6,
      question: 'My certificate is not generating',
      answer: 'Certificates are automatically generated after completing all course requirements and achieving the minimum passing score. If issues persist, contact support.',
      category: 'certificate'
    }
  ];

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        // Get user info from localStorage - try multiple possible keys
        let userInfo = {};
        let userId = null;
        
        // Try different possible localStorage keys
        const possibleKeys = ['userInfo', 'user', 'currentUser', 'authUser', 'userData', 'studentUser'];
        
        for (const key of possibleKeys) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed) {
                // Try multiple possible ID field names
                const possibleIdFields = ['id', '_id', 'user_id', 'userId', 'student_id', 'studentId'];
                for (const field of possibleIdFields) {
                  if (parsed[field]) {
                    userInfo = parsed;
                    userId = parsed[field];
                    console.log(`Found user info in localStorage key: ${key}, ID field: ${field}`, userInfo);
                    console.log(`Using userId: ${userId}`);
                    break;
                  }
                }
                if (userId) break;
              }
            }
          } catch (e) {
            console.warn(`Error parsing ${key} from localStorage:`, e);
          }
        }
        
        if (userId) {
          console.log('Fetching support tickets for user:', userId);
          
          // Try to fetch tickets from API - use user_id parameter to get only this student's tickets
          const response = await apiRequest(`/support/tickets?user_id=${userId}`, {
            method: 'GET'
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('Fetched tickets from API:', result);
            
            // Handle the API response structure: {success: true, data: {tickets: [...], ...}}
            let ticketsData = [];
            if (result.success && result.data && result.data.tickets) {
              ticketsData = result.data.tickets;
            } else if (Array.isArray(result)) {
              // Fallback if API returns array directly
              ticketsData = result;
            } else if (result.tickets) {
              // Another fallback format
              ticketsData = result.tickets;
            }
            
            console.log(`Found ${ticketsData.length} tickets for user ${userId}`);
            
            // Transform API data to match our component format if needed
            const transformedTickets = ticketsData.map(ticket => ({
              id: ticket._id || ticket.id, // Include the MongoDB ObjectId (_id from API)
              ticket_number: ticket.ticket_number,
              subject: ticket.subject,
              category: ticket.category,
              priority: ticket.priority,
              status: ticket.status,
              course: ticket.course,
              description: ticket.description,
              assigned_to: ticket.assigned_to || 'Support Team',
              attachment_count: ticket.attachment_count || 0,
              createdDate: ticket.created_date ? new Date(ticket.created_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              lastUpdate: ticket.last_updated ? new Date(ticket.last_updated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              responses: ticket.responses || []
            }));
            
            setTickets(transformedTickets);
            console.log(`Set ${transformedTickets.length} tickets for current student:`, transformedTickets);
          } else {
            console.warn('Failed to fetch tickets from API, using mock data filtered by user');
            // Filter mock tickets to simulate user-specific tickets
            const mockUserTickets = mockTickets.slice(0, 2); // Show subset for demo
            setTickets(mockUserTickets);
          }
        } else {
          console.warn('No user ID found, using limited mock data');
          // Show limited mock data when no user is found
          const limitedMockTickets = mockTickets.slice(0, 1);
          setTickets(limitedMockTickets);
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);
        console.log('Using mock data due to API error');
        setTickets(mockTickets);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTickets();
  }, []);

  const handleViewDetails = (ticketNumber) => {
    const ticket = tickets.find(t => t.ticket_number === ticketNumber);
    setSelectedTicket(ticket);
    setShowTicketDetail(true);
  };

  const handleAddResponse = (ticketNumber) => {
    const ticket = tickets.find(t => t.ticket_number === ticketNumber);
    setSelectedTicket(ticket);
    setShowAddResponse(true);
  };

  const handleCreateTicket = (ticketData) => {
    // Add the new ticket to the beginning of the tickets list
    setTickets(prev => [ticketData, ...prev]);
  };

  const filteredTickets = tickets.filter(ticket => {
    return ticketFilter === 'all' || ticket.status === ticketFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl';
      case 'in_progress':
        return 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xl';
      case 'resolved':
        return 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl';
      case 'closed':
        return 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-xl';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-xl';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-xl';
      case 'medium':
        return 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xl';
      case 'low':
        return 'bg-gradient-to-r from-orange-600 to-emerald-600 text-white shadow-xl';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-xl';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'technical':
        return '🔧';
      case 'course_management':
      case 'academic':
      case 'course':
        return '📚';
      case 'billing':
        return '💳';
      case 'certificates':
      case 'certificate':
        return '🏆';
      case 'general':
      case 'account':
        return '👤';
      default:
        return '❓';
    }
  };

  // Ticket Card Component - Compact Grid Design
  const TicketCard = ({ ticket, onViewDetails, onAddResponse }) => {
    return (
      <div className="relative w-full">
        {/* Main Ticket Card */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl overflow-hidden transform hover:scale-105 transition-all duration-300 border border-gray-200 h-full flex flex-col">
          
          {/* Ticket Header - Compact */}
          <div className="relative">
            {/* Top Section with Ticket Info */}
            <div className={`px-6 py-4 ${getStatusColor(ticket.status)} relative`}>
              {/* Decorative dots for perforated edge */}
              <div className="absolute bottom-0 left-0 right-0 h-3 flex justify-center space-x-1">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="w-2 h-2 bg-white rounded-full opacity-90"></div>
                ))}
              </div>
              
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl bg-white bg-opacity-20 rounded-xl p-2 backdrop-blur-sm">
                    {getCategoryIcon(ticket.category)}
                  </div>
                  <div>
                    <div className="text-white text-lg font-bold mb-1">{ticket.ticket_number}</div>
                    <div className="text-white opacity-90 text-xs uppercase tracking-wide font-semibold">
                      SUPPORT TICKET
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Perforated Edge */}
            <div className="relative h-6 bg-gray-50">
              <div className="absolute top-0 left-0 right-0 h-3 flex justify-center space-x-1">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="w-2 h-2 bg-gray-300 rounded-full"></div>
                ))}
              </div>
            </div>
          </div>

          {/* Ticket Body - Flexible */}
          <div className="p-6 bg-gradient-to-br from-gray-50 to-white flex-1 flex flex-col">
            {/* Subject */}
            <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">{ticket.subject}</h2>
              {ticket.course && (
                <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                  📚 {ticket.course.length > 20 ? `${ticket.course.substring(0, 20)}...` : ticket.course}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-4 flex-1">
              <p className="text-gray-600 leading-relaxed text-sm">
                {ticket.description.length > 80 
                  ? `${ticket.description.substring(0, 80)}...` 
                  : ticket.description
                }
              </p>
            </div>

            {/* Ticket Info Grid - Compact */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-center">
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                <div className="text-lg font-bold text-blue-600">{ticket.responses.length}</div>
                <div className="text-xs text-gray-500 uppercase">Replies</div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                <div className={`text-lg font-bold ${
                  ticket.status === 'open' ? 'text-red-600' :
                  ticket.status === 'in_progress' ? 'text-yellow-600' :
                  ticket.status === 'resolved' ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {ticket.status === 'open' ? '⏳' :
                   ticket.status === 'in_progress' ? '🔄' :
                   ticket.status === 'resolved' ? '✅' : '📋'}
                </div>
                <div className="text-xs text-gray-500 uppercase">Status</div>
              </div>
            </div>

            {/* Latest Response Preview */}
            {ticket.responses.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-800">Latest Response</span>
                  <span className="text-xs text-blue-600">
                    {new Date(ticket.responses[ticket.responses.length - 1].timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <p className="text-blue-700 text-xs leading-relaxed">
                  {ticket.responses[ticket.responses.length - 1].message.length > 60 
                    ? `${ticket.responses[ticket.responses.length - 1].message.substring(0, 60)}...`
                    : ticket.responses[ticket.responses.length - 1].message
                  }
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 mt-auto">
              <button 
                onClick={() => onViewDetails(ticket.ticket_number)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Details
              </button>
              
              {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                <button 
                  onClick={() => onAddResponse(ticket.ticket_number)}
                  className="w-full bg-gradient-to-r from-orange-600 to-emerald-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-orange-700 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Reply
                </button>
              )}
            </div>
          </div>

          {/* Ticket Stub/Footer - Compact */}
          <div className="bg-gray-100 px-4 py-3 border-t-2 border-dashed border-gray-300">
            <div className="flex justify-between items-center text-xs">
              <div className="text-gray-600">
                <strong>ID:</strong> {ticket.ticket_number.split('_')[1] || ticket.ticket_number}
              </div>
              <div className="text-gray-500">
                {new Date(ticket.lastUpdate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Corner Cuts - Smaller */}
        <div className="absolute top-0 left-0 w-3 h-3 bg-gray-200 transform rotate-45 -translate-x-1.5 -translate-y-1.5"></div>
        <div className="absolute top-0 right-0 w-3 h-3 bg-gray-200 transform rotate-45 translate-x-1.5 -translate-y-1.5"></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 bg-gray-200 transform rotate-45 -translate-x-1.5 translate-y-1.5"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-200 transform rotate-45 translate-x-1.5 translate-y-1.5"></div>
      </div>
    );
  };

  // Add Response Modal Component
  const AddResponseModal = ({ ticket, onClose, onResponseAdded }) => {
    const [responseText, setResponseText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      if (!responseText.trim()) {
        alert('Please enter a response message.');
        return;
      }

      setIsSubmitting(true);

      try {
        // Get user info from localStorage
        let userId = null;
        const possibleKeys = ['userInfo', 'user', 'currentUser', 'authUser', 'userData', 'studentUser'];
        
        for (const key of possibleKeys) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed) {
                const possibleIdFields = ['id', '_id', 'user_id', 'userId', 'student_id', 'studentId'];
                for (const field of possibleIdFields) {
                  if (parsed[field]) {
                    userId = parsed[field];
                    break;
                  }
                }
                if (userId) break;
              }
            }
          } catch (e) {
            console.warn(`Error parsing ${key} from localStorage:`, e);
          }
        }

        if (!userId) {
          alert('Authentication required. Please log in again.');
          return;
        }

        // Use the MongoDB ObjectId for the API call
        const ticketId = ticket.id || ticket._id; // Try both possible ID fields
        
        if (!ticketId) {
          console.error('Ticket ID is missing!', ticket);
          alert('Error: Ticket ID is missing. Please refresh the page and try again.');
          return;
        }
        
        console.log('Adding response to ticket:', {
          ticketId,
          originalTicket: ticket,
          message: responseText.trim(),
          userId
        });

        const response = await supportService.addResponse(ticketId, responseText.trim(), userId);

        console.log('Add response API result:', response);

        if (response.success) {
          const newResponseObj = {
            id: response.data?.response_id || response.data?.id || Date.now(),
            message: responseText.trim(),
            created_date: new Date().toISOString(),
            user_name: response.data?.user_name || 'You',
            user_email: response.data?.user_email || '',
            isSupport: false
          };

          console.log('Created new response object:', newResponseObj);

          // Update the specific ticket in the tickets array
          setTickets(prevTickets => 
            prevTickets.map(t => 
              t.ticket_number === ticket.ticket_number 
                ? { 
                    ...t, 
                    responses: [...(t.responses || []), newResponseObj],
                    lastUpdate: new Date().toISOString().split('T')[0]
                  }
                : t
            )
          );

          // Call the callback to update the selected ticket if viewing details
          onResponseAdded(newResponseObj);

          // Refresh tickets from server to ensure data consistency
          console.log('Refreshing tickets from server to ensure persistence...');
          try {
            // Re-fetch the tickets to ensure the response is properly saved
            let userInfo = {};
            let userId = null;
            
            // Try different possible localStorage keys
            const possibleKeys = ['userInfo', 'user', 'currentUser', 'authUser', 'userData', 'studentUser'];
            
            for (const key of possibleKeys) {
              try {
                const stored = localStorage.getItem(key);
                if (stored) {
                  const parsed = JSON.parse(stored);
                  if (parsed) {
                    // Try multiple possible ID field names
                    const possibleIdFields = ['id', '_id', 'user_id', 'userId', 'student_id', 'studentId'];
                    for (const field of possibleIdFields) {
                      if (parsed[field]) {
                        userInfo = parsed;
                        userId = parsed[field];
                        break;
                      }
                    }
                    if (userId) break;
                  }
                }
              } catch (e) {
                console.warn(`Error parsing ${key} from localStorage:`, e);
              }
            }

            if (userId) {
              const refreshResponse = await apiRequest(`/support/tickets?user_id=${userId}`, {
                method: 'GET'
              });
              
              if (refreshResponse.ok) {
                const refreshResult = await refreshResponse.json();
                let refreshedTicketsData = [];
                if (refreshResult.success && refreshResult.data && refreshResult.data.tickets) {
                  refreshedTicketsData = refreshResult.data.tickets;
                } else if (Array.isArray(refreshResult)) {
                  refreshedTicketsData = refreshResult;
                } else if (refreshResult.tickets) {
                  refreshedTicketsData = refreshResult.tickets;
                }

                const transformedRefreshedTickets = refreshedTicketsData.map(refreshedTicket => ({
                  id: refreshedTicket._id || refreshedTicket.id, // Include the MongoDB ObjectId
                  ticket_number: refreshedTicket.ticket_number,
                  subject: refreshedTicket.subject,
                  category: refreshedTicket.category,
                  priority: refreshedTicket.priority,
                  status: refreshedTicket.status,
                  course: refreshedTicket.course,
                  description: refreshedTicket.description,
                  assigned_to: refreshedTicket.assigned_to || 'Support Team',
                  attachment_count: refreshedTicket.attachment_count || 0,
                  createdDate: refreshedTicket.created_date ? new Date(refreshedTicket.created_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                  lastUpdate: refreshedTicket.last_updated ? new Date(refreshedTicket.last_updated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                  responses: refreshedTicket.responses || []
                }));

                setTickets(transformedRefreshedTickets);
                console.log('Refreshed tickets from server:', transformedRefreshedTickets.length);
              }
            }
          } catch (refreshError) {
            console.warn('Failed to refresh tickets from server:', refreshError);
          }

          setResponseText('');
          onClose();
          alert('Response added successfully!');
        } else {
          console.error('Failed to add response:', response);
          alert(response.message || 'Failed to add response. Please try again.');
        }
      } catch (error) {
        console.error('Error adding response:', error);
        alert('Error adding response. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white rounded-t-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">Add Response</h3>
                <p className="text-emerald-100 mt-1">
                  Ticket: {ticket.ticket_number} - {ticket.subject}
                </p>
              </div>
              <button 
                onClick={onClose} 
                className="text-white hover:text-gray-200 transition-colors"
                disabled={isSubmitting}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Response <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-vertical"
                placeholder="Please provide additional details or ask follow-up questions..."
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-2">
                Minimum 10 characters. Be clear and specific to help our support team assist you better.
              </p>
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                disabled={isSubmitting || !responseText.trim() || responseText.trim().length < 10}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding Response...
                  </>
                ) : (
                  'Add Response'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Enhanced Create Ticket Modal
  const CreateTicketModal = ({ onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
      subject: '',
      category: 'technical',
      priority: 'medium',
      course: '',
      description: '',
      attachments: []
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      // Form validation
      if (!formData.subject.trim()) {
        alert('Please enter a subject for your support ticket.');
        return;
      }
      
      if (!formData.description.trim() || formData.description.trim().length < 50) {
        alert('Please provide a detailed description (minimum 50 characters).');
        return;
      }
      
      setIsSubmitting(true);
      
      try {
        // Get user info from localStorage or session - try multiple possible keys
        let userInfo = {};
        let userId = null;
        
        // Try different possible localStorage keys
        const possibleKeys = ['userInfo', 'user', 'currentUser', 'authUser', 'userData', 'studentUser'];
        
        for (const key of possibleKeys) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed) {
                // Try multiple possible ID field names
                const possibleIdFields = ['id', '_id', 'user_id', 'userId', 'student_id', 'studentId'];
                for (const field of possibleIdFields) {
                  if (parsed[field]) {
                    userInfo = parsed;
                    userId = parsed[field];
                    console.log(`Found user info in localStorage key: ${key}, ID field: ${field}`, userInfo);
                    console.log(`Using userId for ticket creation: ${userId}`);
                    break;
                  }
                }
                if (userId) break;
              }
            }
          } catch (e) {
            console.warn(`Error parsing ${key} from localStorage:`, e);
          }
        }
        
        // If no user ID found, try to use a default or generate one for testing
        if (!userId) {
          console.warn('No user ID found in localStorage. Available keys:', Object.keys(localStorage));
          console.warn('Using fallback user ID for testing...');
          // Use a test user ID if no authentication found
          userId = 'test-user-' + Date.now();
        }
        
        console.log('Using userId:', userId);
        
        // Prepare the ticket data for API
        const ticketData = {
          subject: formData.subject.trim(),
          description: formData.description.trim(),
          category: formData.category,
          priority: formData.priority,
          course: formData.course.trim() || null,
          user_id: userId,  // Use user_id, not student_id
          status: 'open'
        };

        console.log('Creating support ticket:', ticketData);

        // Make API call to create support ticket
        const response = await apiRequest('/support/tickets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ticketData)
        });

        console.log('API response status:', response.status);
        console.log('API response ok:', response.ok);

        if (response.ok) {
          const responseData = await response.json();
          console.log('Support ticket created successfully:', responseData);
          
          // Add the new ticket to local state with API response data
          const newTicket = {
            id: responseData.data?.ticket_id || responseData.data?._id || responseData._id, // Include MongoDB ObjectId
            ticket_number: responseData.data?.ticket_number || responseData.ticket_number || `TKT_${Date.now()}`,
            subject: ticketData.subject,
            category: ticketData.category,
            priority: ticketData.priority,
            status: 'open',
            course: ticketData.course,
            description: ticketData.description,
            assigned_to: 'Support Team',
            attachment_count: 0,
            createdDate: new Date().toISOString().split('T')[0],
            lastUpdate: new Date().toISOString().split('T')[0],
            responses: []
          };
          
          onSubmit(newTicket);
          
          // Reset form
          setFormData({
            subject: '',
            category: 'technical',
            priority: 'medium',
            course: '',
            description: '',
            attachments: []
          });
          
          onClose();
          
          // Show success message
          alert('Support ticket created successfully! You will receive updates via email.');
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('API Error:', response.status, errorData);
          console.error('Full error response:', errorData);
          
          // Display detailed validation errors
          if (errorData.detail && Array.isArray(errorData.detail)) {
            const errorMessages = errorData.detail.map(err => `${err.loc?.join(' -> ') || 'Field'}: ${err.msg}`).join('\n');
            console.error('Validation errors:', errorMessages);
            alert(`Validation errors:\n${errorMessages}`);
          } else {
            throw new Error(errorData.message || `Server error: ${response.status}`);
          }
        }
      } catch (error) {
        console.error('Error creating ticket:', error);
        alert(`Error creating ticket: ${error.message || 'Please try again.'}`);
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleFileUpload = (e) => {
      const files = Array.from(e.target.files);
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...files]
      }));
    };

    const removeAttachment = (index) => {
      setFormData(prev => ({
        ...prev,
        attachments: prev.attachments.filter((_, i) => i !== index)
      }));
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white rounded-t-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold">Create Support Ticket</h3>
                <p className="text-blue-100 mt-1">We're here to help you resolve any issues</p>
              </div>
              <button 
                onClick={onClose} 
                className="text-white hover:text-gray-200 transition-colors"
                disabled={isSubmitting}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Brief description of your issue"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isSubmitting}
                >
                  <option value="technical">🔧 Technical Issue</option>
                  <option value="course_management">📚 Course Management</option>
                  <option value="billing">💳 Billing/Payment</option>
                  <option value="certificates">🏆 Certificate Issue</option>
                  <option value="general">👤 General/Account</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isSubmitting}
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">� High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Related Course (Optional)</label>
              <input
                type="text"
                value={formData.course}
                onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Course name if this issue is course-specific"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Please provide detailed information about your issue..."
                disabled={isSubmitting}
              />
              <p className={`text-xs mt-2 ${formData.description.length >= 50 ? 'text-orange-600' : 'text-red-500'}`}>
                {formData.description.length}/50 characters minimum. Include steps to reproduce the issue if applicable.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Attachments (Optional)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                  disabled={isSubmitting}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                  </svg>
                  <p className="text-gray-600">Click to upload files or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF, DOC up to 10MB each</p>
                </label>
              </div>
              
              {formData.attachments.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Attached Files:</h4>
                  <div className="space-y-2">
                    {formData.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm text-gray-600">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700"
                          disabled={isSubmitting}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Ticket...
                  </>
                ) : (
                  'Create Ticket'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Ticket Detail Modal Component
  const TicketDetailModal = ({ ticket, onClose }) => {
    const [currentTicket, setCurrentTicket] = useState(ticket);

    const handleResponseAdded = (newResponse) => {
      // Update the current ticket being viewed
      setCurrentTicket(prev => ({
        ...prev,
        responses: [...(prev.responses || []), newResponse],
        lastUpdate: new Date().toISOString().split('T')[0]
      }));
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6 text-white rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{currentTicket.ticket_number}</h2>
                <p className="text-lg text-indigo-200 mt-1">{currentTicket.subject}</p>
                <div className="flex items-center space-x-3 mt-3">
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(currentTicket.status)}`}>
                    {currentTicket.status.replace('_', ' ')}
                  </span>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${getPriorityColor(currentTicket.priority)}`}>
                    {currentTicket.priority}
                  </span>
                  <span className="text-sm text-indigo-200">
                    {getCategoryIcon(currentTicket.category)} {currentTicket.category}
                  </span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Ticket Information */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 mb-6 border-l-4 border-indigo-500">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Original Message</h3>
              <p className="text-gray-700 leading-relaxed">{currentTicket.description}</p>
              <div className="flex items-center space-x-6 mt-4 text-sm text-gray-600">
                <span>Created: {new Date(currentTicket.createdDate).toLocaleDateString()}</span>
                <span>Last Updated: {new Date(currentTicket.lastUpdate).toLocaleDateString()}</span>
                {currentTicket.course && <span>Course: {currentTicket.course}</span>}
                {currentTicket.assigned_to && <span>Assigned to: {currentTicket.assigned_to}</span>}
              </div>
            </div>

            {/* Responses */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Responses ({currentTicket.responses ? currentTicket.responses.length : 0})
              </h3>
              
              {currentTicket.responses && currentTicket.responses.length > 0 ? (
                <div className="space-y-4">
                  {currentTicket.responses.map((response, index) => (
                    <div key={response.id || index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            response.isSupport 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {response.isSupport ? 'S' : 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{response.user_name || response.author || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">
                              {response.created_date ? new Date(response.created_date).toLocaleString() : 
                               response.timestamp ? new Date(response.timestamp).toLocaleString() : 'Unknown time'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{response.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>No responses yet</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
              <button 
                onClick={onClose}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Close
              </button>
              {currentTicket.status !== 'closed' && currentTicket.status !== 'resolved' && (
                <button 
                  onClick={() => setShowAddResponse(true)}
                  className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Add Response
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Add Response Modal */}
        {showAddResponse && (
          <AddResponseModal
            ticket={currentTicket}
            onClose={() => setShowAddResponse(false)}
            onResponseAdded={handleResponseAdded}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Manager */}
      <NotificationManager />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Support Center</h1>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreateTicket(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Support Ticket
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-3xl mb-2">📞</div>
          <h3 className="font-medium text-gray-900">Contact Us</h3>
          <p className="text-xs text-gray-600">Available 24/7</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-3xl mb-2">📧</div>
          <h3 className="font-medium text-gray-900">Email Support</h3>
          <p className="text-xs text-gray-600">Response in 24h</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-3xl mb-2">📚</div>
          <h3 className="font-medium text-gray-900">Knowledge Base</h3>
          <p className="text-xs text-gray-600">Self-help articles</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 text-center hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-3xl mb-2">👥</div>
          <h3 className="font-medium text-gray-900">Community</h3>
          <p className="text-xs text-gray-600">Student discussions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex space-x-1 mb-6">
          {[
            { id: 'tickets', label: 'My Tickets' },
            { id: 'faq', label: 'FAQ' },
            { id: 'contact', label: 'Contact Info' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div className="space-y-4">
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search FAQ..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {faqs.map((faq) => (
              <div key={faq.id} className="border border-gray-200 rounded-lg">
                <div className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-xl">{getCategoryIcon(faq.category)}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                      <p className="text-gray-600 text-sm">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact Info Tab */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">📧</span>
                    <div>
                      <div className="font-medium text-gray-900">Email Support</div>
                      <div className="text-sm text-gray-600">support@lmssy.com</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">📞</span>
                    <div>
                      <div className="font-medium text-gray-900">Phone Support</div>
                      <div className="text-sm text-gray-600">+1 (555) 123-4567</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">💬</span>
                    <div>
                      <div className="font-medium text-gray-900">Live Chat</div>
                      <div className="text-sm text-gray-600">Available 24/7</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Support Hours</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monday - Friday:</span>
                    <span className="font-medium">9:00 AM - 6:00 PM PST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saturday:</span>
                    <span className="font-medium">10:00 AM - 4:00 PM PST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sunday:</span>
                    <span className="font-medium">Closed</span>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> Live chat and email support are available 24/7. 
                      Phone support follows the hours listed above.
                    </p>
                  </div>
                </div> 
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateTicket && (
        <CreateTicketModal
          onClose={() => setShowCreateTicket(false)}
          onSubmit={handleCreateTicket}
        />
      )}

      {/* Ticket Detail Modal */}
      {showTicketDetail && selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => {
            setShowTicketDetail(false);
            setSelectedTicket(null);
          }}
        />
      )}

      {/* Add Response Modal */}
      {showAddResponse && selectedTicket && !showTicketDetail && (
        <AddResponseModal
          ticket={selectedTicket}
          onClose={() => {
            setShowAddResponse(false);
            setSelectedTicket(null);
          }}
          onResponseAdded={(newResponse) => {
            // Update the ticket in the tickets array
            setTickets(prevTickets => 
              prevTickets.map(t => 
                t.ticket_number === selectedTicket.ticket_number 
                  ? { 
                      ...t, 
                      responses: [...(t.responses || []), newResponse],
                      lastUpdate: new Date().toISOString().split('T')[0]
                    }
                  : t
              )
            );
          }}
        />
      )}
    </div>
  );
};

export default StudentSupport;
