import { useEffect, useState } from 'react';
import { NotificationManager } from '../../components/TicketNotification';
import { supportService } from '../../services/supportService';
import { ticketUpdateService } from '../../services/ticketUpdateService';

// Add CSS animations
const modalStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideInFromTop {
    from { 
      opacity: 0;
      transform: translateY(-100px) scale(0.95);
    }
    to { 
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  @keyframes slideOutToTop {
    from { 
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    to { 
      opacity: 0;
      transform: translateY(-100px) scale(0.95);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
  
  .animate-slideInFromTop {
    animation: slideInFromTop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  
  .animate-slideOutToTop {
    animation: slideOutToTop 0.3s ease-in;
  }
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('modal-animations')) {
  const style = document.createElement('style');
  style.id = 'modal-animations';
  style.textContent = modalStyles;
  document.head.appendChild(style);
}

const InstructorSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('createdDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Load tickets from API on component mount
  useEffect(() => {
    fetchTickets();
    
    // Subscribe to ticket updates
    const unsubscribe = ticketUpdateService.subscribe('InstructorSupport', (update) => {
      console.log('Instructor Support received update:', update);
      
      // Handle different types of updates
      switch (update.type) {
        case 'STATUS_CHANGE':
          // Update the ticket status in local state
          setTickets(prevTickets => 
            prevTickets.map(ticket => 
              ticket.id === update.ticketId || ticket.ticket_number === update.ticketId
                ? { 
                    ...ticket, 
                    status: update.newStatus, 
                    lastUpdated: update.timestamp.split('T')[0]
                  }
                : ticket
            )
          );
          
          // Update selected ticket if it's currently being viewed
          if (selectedTicket && (selectedTicket.id === update.ticketId || selectedTicket.ticket_number === update.ticketId)) {
            setSelectedTicket(prev => ({
              ...prev,
              status: update.newStatus,
              lastUpdated: update.timestamp.split('T')[0]
            }));
          }
          
          // Show notification to user
          console.log(`Your ticket status has been updated to: ${update.newStatus} by ${update.updatedBy}`);
          
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
          // Note: Only refresh if the response was added by admin/support and it's for this instructor's ticket
          if (update.addedBy !== 'instructor') {
            // Check if this ticket belongs to the current instructor before refreshing
            const currentTicket = tickets.find(t => t.id === update.ticketId || t.ticket_number === update.ticketId);
            if (currentTicket) {
              console.log('New response added by support team to instructor ticket, refreshing tickets...');
              fetchTickets(); // Refresh all tickets to get updated responses
            }
          }
          break;
          
        case 'TICKET_ASSIGNED':
          // Update ticket assignment
          setTickets(prevTickets => 
            prevTickets.map(ticket => 
              ticket.id === update.ticketId || ticket.ticket_number === update.ticketId
                ? { ...ticket, assigned_to: update.assignedTo }
                : ticket
            )
          );
          break;
          
        case 'PRIORITY_CHANGE':
          // Update ticket priority
          setTickets(prevTickets => 
            prevTickets.map(ticket => 
              ticket.id === update.ticketId || ticket.ticket_number === update.ticketId
                ? { ...ticket, priority: update.newPriority }
                : ticket
            )
          );
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

  // Fetch tickets from backend
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { userId } = getUserInfo();
      
      if (!userId) {
        console.warn('No user ID found, cannot fetch tickets');
        setTickets([]);
        setLoading(false);
        return;
      }

      const response = await supportService.getTickets();
      if (response.success && response.data && response.data.tickets) {
        console.log('Total tickets from API:', response.data.tickets.length);
        console.log('Current instructor user ID:', userId);
        
        // Filter tickets to only show tickets belonging to the current instructor
        const instructorTickets = response.data.tickets.filter(ticket => {
          // Check multiple possible user ID fields to match with the current instructor
          return ticket.user_id === userId || 
                 ticket.created_by === userId || 
                 ticket.instructor_id === userId ||
                 ticket.userId === userId;
        });

        console.log('Filtered instructor tickets:', instructorTickets.length);
        console.log('Instructor tickets:', instructorTickets);

        const transformedTickets = instructorTickets.map(ticket => ({
          id: ticket.id || ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          subject: ticket.subject,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          createdDate: ticket.created_date ? new Date(ticket.created_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          lastUpdated: ticket.last_updated ? new Date(ticket.last_updated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          responses: ticket.responses || [],
          assigned_to: ticket.assigned_to,
          attachment_count: ticket.attachment_count || 0
        }));
        setTickets(transformedTickets);
      } else {
        console.error('Failed to fetch tickets:', response);
        setTickets([]);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  // Get user info from localStorage with better error handling
  const getUserInfo = () => {
    const possibleKeys = ['userInfo', 'user', 'currentUser', 'authUser', 'userData', 'instructorUser'];
    
    for (const key of possibleKeys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed) {
            const possibleIdFields = ['id', '_id', 'user_id', 'userId', 'instructor_id', 'instructorId'];
            for (const field of possibleIdFields) {
              if (parsed[field]) {
                console.log(`Found user info in localStorage key: ${key}, ID field: ${field}`);
                return { 
                  userInfo: parsed, 
                  userId: parsed[field],
                  userName: parsed.name || parsed.username || parsed.email || 'Unknown User'
                };
              }
            }
          }
        }
      } catch (e) {
        console.warn(`Error parsing ${key} from localStorage:`, e);
      }
    }
    
    console.warn('No valid user information found in localStorage');
    return { 
      userInfo: null, 
      userId: null,
      userName: null
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-700';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700';
      case 'resolved':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const TicketCard = ({ ticket }) => (
    <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:border-blue-300 hover:scale-105 transition-all duration-300 cursor-pointer w-full max-w-sm h-64 flex flex-col justify-between animate-fade-in" onClick={() => setSelectedTicket(ticket)}>
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11h6m-3-3v6m9-9v18a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <h3 className="text-lg font-bold text-gray-800 line-clamp-2">
              {ticket.ticket_number ? `${ticket.ticket_number} - ` : `#${ticket.id} - `}{ticket.subject}
            </h3>
          </div>
        </div>
        <p className="text-gray-600 text-sm line-clamp-3 mb-3">{ticket.description}</p>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span className="capitalize flex items-center">
            <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {ticket.category}
          </span>
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date(ticket.createdDate).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)} flex items-center`}>
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 5a1 1 0 112 0v4h4a1 1 0 110 2H9a1 1 0 01-1-1V6a1 1 0 011-1z" />
            </svg>
            {ticket.status.replace('_', ' ')}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)} flex items-center`}>
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-xs text-gray-600">
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5V16z" />
            </svg>
            {ticket.responses && ticket.responses.length > 0 ? ticket.responses.length : 0} responses
          </span>
          {ticket.attachment_count > 0 && (
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {ticket.attachment_count} attachments
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); }}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 flex items-center space-x-1 group"
        >
          <svg className="w-4 h-4 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>View Details</span>
        </button>
      </div>
    </div>
  );

  const CreateTicketModal = () => {
    const [formData, setFormData] = useState({
      subject: '',
      description: '',
      category: 'general',
      priority: 'medium',
      courseRelated: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');

    // Form validation
    const validateForm = () => {
      const newErrors = {};

      if (!formData.subject.trim()) {
        newErrors.subject = 'Subject is required';
      } else if (formData.subject.trim().length < 3) {
        newErrors.subject = 'Subject must be at least 3 characters long';
      }

      if (!formData.description.trim()) {
        newErrors.description = 'Description is required';
      } else if (formData.description.trim().length < 10) {
        newErrors.description = 'Description must be at least 10 characters long';
      }

      if (!formData.category) {
        newErrors.category = 'Category is required';
      }

      if (!formData.priority) {
        newErrors.priority = 'Priority is required';
      }

      return newErrors;
    };

    // Handle input changes
    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));

      // Clear error for this field
      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
      e.preventDefault();
      
      const formErrors = validateForm();
      if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        return;
      }

      setIsSubmitting(true);
      setErrors({});

      try {
        const { userId } = getUserInfo();
        
        if (!userId) {
          setErrors({ general: 'Authentication required. Please log in again.' });
          setIsSubmitting(false);
          return;
        }

        const ticketData = {
          subject: formData.subject.trim(),
          description: formData.description.trim(),
          category: formData.category,
          priority: formData.priority,
          course: formData.courseRelated.trim() || null,
          user_id: userId,
          user_type: 'instructor'
        };

        const response = await supportService.createTicket(ticketData);

        if (response.success) {
          // Create ticket object for local state
          const newTicket = {
            id: response.data.id || response.data.ticket_id,
            ticket_number: response.data.ticket_number,
            subject: formData.subject.trim(),
            description: formData.description.trim(),
            category: formData.category,
            priority: formData.priority,
            status: 'open',
            createdDate: new Date().toISOString().split('T')[0],
            lastUpdated: new Date().toISOString().split('T')[0],
            responses: [],
            assigned_to: response.data.assigned_to || 'Support Team',
            attachment_count: 0
          };

          // Add to tickets list
          setTickets(prev => [newTicket, ...prev]);
          
          setSuccessMessage('Support ticket created successfully!');
          
          // Reset form
          setFormData({
            subject: '',
            description: '',
            category: 'general',
            priority: 'medium',
            courseRelated: ''
          });

          // Close modal after 2 seconds
          setTimeout(() => {
            handleCloseModal();
          }, 2000);

        } else {
          setErrors({ general: response.message || 'Failed to create ticket. Please try again.' });
        }
      } catch (error) {
        console.error('Error creating ticket:', error);
        setErrors({ general: 'An unexpected error occurred. Please try again.' });
      } finally {
        setIsSubmitting(false);
      }
    };

    // Handle modal close
    const handleCloseModal = () => {
      if (isSubmitting) return;

      setFormData({
        subject: '',
        description: '',
        category: 'general',
        priority: 'medium',
        courseRelated: ''
      });
      setErrors({});
      setSuccessMessage('');
      setShowCreateModal(false);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Create Support Ticket</h2>
                <p className="text-blue-100 mt-1">Get help from our support team</p>
              </div>
              <button 
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form Container */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-orange-700 font-medium">{successMessage}</p>
                </div>
              </div>
            )}

            {/* General Error */}
            {errors.general && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{errors.general}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.subject 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Brief description of your issue"
                  disabled={isSubmitting}
                />
                {errors.subject && (
                  <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
                )}
              </div>

              {/* Category and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.category 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    disabled={isSubmitting}
                  >
                    <option value="general">General Support</option>
                    <option value="technical">Technical Issues</option>
                    <option value="billing">Billing & Payments</option>
                    <option value="course_management">Course Management</option>
                    <option value="certificates">Certificates</option>
                    <option value="account">Account Issues</option>
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority *
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.priority 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                    disabled={isSubmitting}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  {errors.priority && (
                    <p className="mt-1 text-sm text-red-600">{errors.priority}</p>
                  )}
                </div>
              </div>

              {/* Course Related */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Related (Optional)
                </label>
                <input
                  type="text"
                  name="courseRelated"
                  value={formData.courseRelated}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter course name if applicable"
                  disabled={isSubmitting}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={5}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-vertical ${
                    errors.description 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Please describe your issue in detail..."
                  disabled={isSubmitting}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Ticket'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const TicketDetailModal = ({ ticket }) => {
    const [newResponse, setNewResponse] = useState('');
    const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

    const handleAddResponse = async (e) => {
      e.preventDefault();
      if (newResponse.trim() && !isSubmittingResponse) {
        setIsSubmittingResponse(true);
        
        try {
          const { userId } = getUserInfo();
          // Use the MongoDB ObjectId from the ticket data
          const ticketId = ticket.id; // This should be the MongoDB ObjectId
          
          console.log('Adding response to ticket:', {
            ticketId,
            originalTicket: ticket,
            message: newResponse.trim(),
            userId
          });
          
          const response = await supportService.addResponse(
            ticketId, 
            newResponse.trim(), 
            userId
          );
          
          console.log('Add response API result:', response);
          
          if (response.success) {
            // Create response object matching backend format
            const newResponseObj = {
              id: response.data?.response_id || response.data?.id || Date.now(),
              message: newResponse.trim(),
              created_date: new Date().toISOString(),
              user_name: response.data?.user_name || 'You',
              user_email: response.data?.user_email || ''
            };
            
            console.log('Created new response object:', newResponseObj);
            
            // Refresh the specific ticket to get updated responses from server
            console.log('Fetching updated ticket data from server...');
            const refreshedTicketResponse = await supportService.getTicket(ticketId);
            
            if (refreshedTicketResponse.success && refreshedTicketResponse.data) {
              const refreshedTicket = {
                id: refreshedTicketResponse.data.id,
                ticket_number: refreshedTicketResponse.data.ticket_number,
                subject: refreshedTicketResponse.data.subject,
                description: refreshedTicketResponse.data.description,
                category: refreshedTicketResponse.data.category,
                priority: refreshedTicketResponse.data.priority,
                status: refreshedTicketResponse.data.status,
                createdDate: refreshedTicketResponse.data.created_date ? new Date(refreshedTicketResponse.data.created_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                lastUpdated: refreshedTicketResponse.data.last_updated ? new Date(refreshedTicketResponse.data.last_updated).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                responses: refreshedTicketResponse.data.responses || [],
                assigned_to: refreshedTicketResponse.data.assigned_to,
                attachment_count: refreshedTicketResponse.data.attachment_count || 0
              };
              
              console.log('Refreshed ticket from server:', refreshedTicket);
              
              // Update the specific ticket in the tickets array with server data
              setTickets(prevTickets => 
                prevTickets.map(t =>
                  t.id === ticket.id
                    ? refreshedTicket
                    : t
                )
              );
              
              // Update the selected ticket for the current modal view with server data
              setSelectedTicket(refreshedTicket);
              
              console.log('Updated ticket and modal with server data');
            } else {
              console.warn('Failed to fetch refreshed ticket, using local update');
              // Fallback to local update if server fetch fails
              setTickets(prevTickets => 
                prevTickets.map(t =>
                  t.id === ticket.id
                    ? { 
                        ...t, 
                        responses: [...(t.responses || []), newResponseObj], 
                        lastUpdated: new Date().toISOString().split('T')[0] 
                      }
                    : t
                )
              );
              
              setSelectedTicket(prevTicket => ({
                ...prevTicket,
                responses: [...(prevTicket.responses || []), newResponseObj],
                lastUpdated: new Date().toISOString().split('T')[0]
              }));
            }
            
            setNewResponse('');
            alert('Response added successfully!');
          } else {
            console.error('Failed to add response:', response);
            alert(response.message || 'Failed to add response. Please try again.');
          }
        } catch (error) {
          console.error('Error adding response:', error);
          alert('Error adding response. Please try again.');
        } finally {
          setIsSubmittingResponse(false);
        }
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {ticket.ticket_number ? ticket.ticket_number : `#${ticket.id}`} - {ticket.subject}
              </h2>
              <div className="flex items-center space-x-3 mt-2">
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority} priority
                </span>
                <span className="text-sm text-gray-500 capitalize">{ticket.category}</span>
              </div>
            </div>
            <button 
              onClick={() => setSelectedTicket(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Original Message</h3>
            <p className="text-gray-700">{ticket.description}</p>
            <p className="text-sm text-gray-500 mt-2">
              Created: {new Date(ticket.createdDate).toLocaleDateString()}
            </p>
            {ticket.assigned_to && (
              <p className="text-sm text-gray-500 mt-1">
                Assigned to: {ticket.assigned_to}
              </p>
            )}
          </div>

          {/* Responses */}
          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-gray-900">
              Responses ({ticket.responses ? ticket.responses.length : 0})
            </h3>
            {ticket.responses && ticket.responses.length > 0 ? (
              ticket.responses.map((response, index) => (
                <div key={response.id || index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{response.user_name || response.author || 'Unknown'}</span>
                    <span className="text-sm text-gray-500">
                      {response.created_date ? new Date(response.created_date).toLocaleString() : 
                       response.timestamp ? new Date(response.timestamp).toLocaleString() : 'Unknown time'}
                    </span>
                  </div>
                  <p className="text-gray-700">{response.message}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No responses yet</p>
            )}
          </div>

          {/* Add Response */}
          {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <form onSubmit={handleAddResponse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Response</label>
                <textarea
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type your message..."
                  disabled={isSubmittingResponse}
                />
              </div>
              <div className="flex space-x-3">
                <button 
                  type="submit"
                  disabled={isSubmittingResponse || !newResponse.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {isSubmittingResponse ? 'Sending...' : 'Send Response'}
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  disabled={isSubmittingResponse}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Close
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  // Advanced: Filter, search, and sort tickets
  const filteredTickets = tickets
    .filter(ticket =>
      (filterStatus === 'all' || ticket.status === filterStatus) &&
      (ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return sortOrder === 'asc'
          ? priorityOrder[a.priority] - priorityOrder[b.priority]
          : priorityOrder[b.priority] - priorityOrder[a.priority];
      } else {
        // Default: sort by date
        return sortOrder === 'asc'
          ? new Date(a[sortBy]) - new Date(b[sortBy])
          : new Date(b[sortBy]) - new Date(a[sortBy]);
      }
    });

  return (
    <div className="space-y-6">
      {/* Notification Manager */}
      <NotificationManager />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Center</h1>
          <p className="text-gray-600">Get help and support for your instructor account</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
        >
          <span>+</span>
          <span>New Ticket</span>
        </button>
      </div>

      {/* Advanced Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="createdDate">Date Created</option>
            <option value="lastUpdated">Last Updated</option>
            <option value="priority">Priority</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
            title="Toggle sort order"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Support Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{tickets.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-xl text-blue-600">🎫</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Open</p>
              <p className="text-2xl font-bold text-gray-900">
                {tickets.filter(t => t.status === 'open').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <span className="text-xl text-red-600">🔴</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {tickets.filter(t => t.status === 'in_progress').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <span className="text-xl text-yellow-600">⏳</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">
                {tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-xl text-orange-600">✅</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Help Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Help</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">📚 Knowledge Base</h3>
            <p className="text-sm text-gray-600 mb-3">Find answers to common questions</p>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Browse Articles →
            </button>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">📞 Phone Support</h3>
            <p className="text-sm text-gray-600 mb-3">Call our support team for immediate assistance</p>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Call Now →
            </button>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">📧 Email Support</h3>
            <p className="text-sm text-gray-600 mb-3">Send us an email for detailed help</p>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Send Email →
            </button>
          </div>
        </div>
      </div>

      {/* Support Tickets */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Your Support Tickets</h2>
        {loading ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading your support tickets...</p>
          </div>
        ) : filteredTickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredTickets.map((ticket, index) => (
              <div key={ticket.id || ticket.ticket_id} style={{ animationDelay: `${index * 0.1}s` }}>
                <TicketCard ticket={ticket} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 text-lg">
              {searchTerm || filterStatus !== 'all' ? 'No support tickets found' : 'You have no support tickets yet'}
            </p>
            <p className="text-gray-400 mt-2">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Create a support ticket if you need help'
              }
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create Ticket
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && <CreateTicketModal />}
      {selectedTicket && <TicketDetailModal key={`ticket-detail-${selectedTicket.id || selectedTicket.ticket_id}`} ticket={selectedTicket} />}
    </div>
  );
};

export default InstructorSupport;