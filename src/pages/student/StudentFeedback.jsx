import React, { useState, useEffect } from 'react';
import { feedbackAPI, transformFeedbackData, transformToAPIFormat } from '../../services/feedbackAPI';
import AuthService from '../../services/authService';
import { courseService } from '../../services/courseService';

const StudentFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [feedbackCounts, setFeedbackCounts] = useState({
    all: 0,
    pending: 0,
    completed: 0
  });

  // Get current user ID from authentication service
  const getCurrentUserId = () => {
    const user = AuthService.getCurrentUser();
    const userId = user?._id || user?.id;
    
    // Development fallback: if no user is found, use a test user ID
    if (!userId && process.env.NODE_ENV === 'development') {
      console.warn('No authenticated user found, using test user ID for development');
      return '68afca4df8d7a0c4c575b9d1'; // Test user ID that exists in the system
    }
    
    return userId;
  };

  const mockFeedbacks = [
    {
      id: 1,
      type: 'course',
      title: 'React.js Complete Course',
      instructor: 'Dr. Jane Smith',
      status: 'pending',
      dueDate: '2024-01-15',
      completedDate: '2024-01-10',
      rating: null,
      comment: null,
      categories: ['content_quality', 'instructor_performance', 'course_structure', 'overall_satisfaction']
    },
    {
      id: 2,
      type: 'assignment',
      title: 'Database Design Assignment',
      instructor: 'Dr. Sarah Wilson',
      course: 'Node.js Backend Development',
      status: 'completed',
      submittedDate: '2023-12-10',
      rating: 5,
      comment: 'The assignment was challenging but very well structured. It helped me understand database normalization concepts clearly.',
      categories: ['clarity', 'difficulty', 'relevance', 'feedback_quality'],
      instructorResponse: 'Thank you for the feedback! I\'m glad the assignment helped you understand the concepts better.'
    },
    {
      id: 3,
      type: 'live_session',
      title: 'SEO Strategy Workshop',
      instructor: 'Ms. Emily Davis',
      course: 'Digital Marketing Fundamentals',
      status: 'completed',
      attendedDate: '2023-11-18',
      rating: 4,
      comment: 'Great workshop with practical examples. Would love to see more case studies included.',
      categories: ['content_relevance', 'presentation_quality', 'interaction', 'time_management']
    }
  ];

  // Load enrolled courses for the current student
  const loadEnrolledCourses = async () => {
    try {
      const response = await courseService.getEnrolledCourses();
      const courses = response.courses || response || [];
      setEnrolledCourses(courses);
      return courses;
    } catch (err) {
      console.error('Failed to load enrolled courses:', err);
      setError('Failed to load enrolled courses. Please try again.');
      return [];
    }
  };

  // Generate feedback opportunities based on enrolled courses
  const generateCourseFeedbacks = (courses) => {
    return courses.map((course, index) => ({
      id: `course_${course._id || course.id || index}`,
      type: 'course',
      title: course.title || course.name,
      instructor: course.instructor_name || course.instructor || 'Unknown Instructor',
      course: course.title || course.name,
      course_id: course._id || course.id,
      instructor_id: course.instructor_id,
      status: 'pending', // All course feedback starts as pending
      dueDate: null, // You can set due dates if needed
      completedDate: course.completed_date || course.end_date,
      rating: null,
      comment: null,
      categories: ['content_quality', 'instructor_performance', 'course_structure', 'overall_satisfaction']
    }));
  };

  // Load feedback data from API
  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = getCurrentUserId();
      console.log('Loading feedbacks for user ID:', userId);
      
      if (!userId || userId === 'undefined' || userId === 'null') {
        console.error('User authentication check failed:', userId);
        throw new Error('User not authenticated. Please log in.');
      }

      // Load enrolled courses first
      const courses = await loadEnrolledCourses();
      
      if (courses.length === 0) {
        setFeedbacks([]);
        setFeedbackCounts({ all: 0, pending: 0, completed: 0 });
        return;
      }

      try {
        // Try to fetch existing feedback for the user
        const [feedbackData, statsData] = await Promise.all([
          feedbackAPI.getUserFeedback(userId),
          feedbackAPI.getUserFeedbackStats(userId)
        ]);

        // Transform the data to match our frontend format
        let transformedFeedbacks = feedbackData.map(transformFeedbackData);
        
        // Filter feedbacks to only show those for enrolled courses
        const enrolledCourseIds = courses.map(c => c._id || c.id);
        transformedFeedbacks = transformedFeedbacks.filter(feedback => 
          enrolledCourseIds.includes(feedback.course_id)
        );

        // Generate feedback opportunities for enrolled courses that don't have feedback yet
        const existingFeedbackCourseIds = transformedFeedbacks.map(f => f.course_id);
        const coursesNeedingFeedback = courses.filter(course => 
          !existingFeedbackCourseIds.includes(course._id || course.id)
        );
        
        const newFeedbackOpportunities = generateCourseFeedbacks(coursesNeedingFeedback);
        
        // Combine existing feedback with new opportunities
        const allFeedbacks = [...transformedFeedbacks, ...newFeedbackOpportunities];
        
        setFeedbacks(allFeedbacks);
        
        // Calculate counts
        const counts = {
          all: allFeedbacks.length,
          pending: allFeedbacks.filter(f => f.status === 'pending').length,
          completed: allFeedbacks.filter(f => f.status === 'completed').length
        };
        setFeedbackCounts(counts);
        
      } catch (apiError) {
        console.warn('API feedback fetch failed, generating feedback from enrolled courses:', apiError);
        
        // Fallback: Generate feedback opportunities from enrolled courses
        const courseFeedbacks = generateCourseFeedbacks(courses);
        setFeedbacks(courseFeedbacks);
        setFeedbackCounts({
          all: courseFeedbacks.length,
          pending: courseFeedbacks.length,
          completed: 0
        });
      }
      
    } catch (err) {
      console.error('Failed to load feedback:', err);
      setError(`Failed to load feedback data: ${err.message}`);
      
      // Fallback to mock data if everything fails
      setFeedbacks(mockFeedbacks);
      setFeedbackCounts({
        all: mockFeedbacks.length,
        pending: mockFeedbacks.filter(f => f.status === 'pending').length,
        completed: mockFeedbacks.filter(f => f.status === 'completed').length
      });
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const filteredFeedbacks = feedbacks.filter(feedback => {
    return activeTab === 'all' || feedback.status === activeTab;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'course':
        return '📚';
      case 'assignment':
        return '📝';
      case 'live_session':
        return '🎥';
      case 'quiz':
        return '❓';
      case 'instructor':
        return '👨‍🏫';
      default:
        return '💭';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-orange-100 text-orange-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderStars = (rating, interactive = false, onRatingChange = null) => {
    console.log('renderStars called with:', { rating, interactive, hasCallback: !!onRatingChange });
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((starValue) => {
          const isSelected = starValue <= (rating || 0);
          
          return (
            <div
              key={starValue}
              onClick={() => {
                console.log('Star div clicked:', starValue, 'interactive:', interactive);
                if (interactive && onRatingChange) {
                  console.log('Calling onRatingChange with:', starValue);
                  onRatingChange(starValue);
                }
              }}
              className={`text-3xl transition-all duration-200 select-none ${
                interactive 
                  ? 'cursor-pointer hover:scale-110 active:scale-95' 
                  : 'cursor-default'
              } ${
                isSelected ? 'text-yellow-400' : 'text-gray-300'
              } ${
                interactive && !isSelected ? 'hover:text-yellow-200' : ''
              }`}
              style={{ 
                fontSize: '28px',
                lineHeight: '1',
                padding: '8px',
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              ★
            </div>
          );
        })}
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const FeedbackModal = ({ feedback, onClose, onSubmit }) => {
    const [rating, setRating] = useState(feedback?.rating || 0);
    const [comment, setComment] = useState(feedback?.comment || '');
    const [categoryRatings, setCategoryRatings] = useState({});
    const [forceUpdate, setForceUpdate] = useState(0);

    // Track rating state changes
    useEffect(() => {
      console.log('Rating state changed to:', rating);
      setForceUpdate(prev => prev + 1); // Force component rerender
    }, [rating]);

    // Debug logging for rating changes
    const handleRatingChange = (newRating) => {
      console.log('=== RATING CHANGE EVENT ===');
      console.log('Previous rating:', rating);
      console.log('New rating:', newRating);
      console.log('Type of new rating:', typeof newRating);
      
      // Ensure the rating is a valid number
      const validRating = Math.max(1, Math.min(5, parseInt(newRating)));
      console.log('Setting validated rating:', validRating);
      
      setRating(validRating);
      console.log('setRating called with:', validRating);
    };

    // Debug current rating state
    console.log('Current rating state in modal:', rating, 'Force update counter:', forceUpdate);

    const handleSubmit = (e) => {
      e.preventDefault();
      
      console.log('Form submit attempted with rating:', rating);
      
      // Validate rating before submitting
      if (rating === 0) {
        console.error('No rating provided on submit:', rating);
        alert('Please provide a rating between 1 and 5 stars before submitting your feedback.');
        return;
      }
      
      console.log('Submitting feedback with data:', { rating, comment, categoryRatings });
      
      onSubmit({
        rating,
        comment,
        categoryRatings
      });
      onClose();
    };

    const updateCategoryRating = (category, rating) => {
      setCategoryRatings(prev => ({
        ...prev,
        [category]: rating
      }));
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Provide Feedback - {feedback?.title}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Overall Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overall Rating <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    {renderStars(rating, true, handleRatingChange)}
                    <span className="text-sm text-gray-500 font-bold bg-yellow-100 px-2 py-1 rounded">Current: {rating}</span>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Test button clicked, current rating:', rating);
                        setRating(5);
                        console.log('Force set rating to 5');
                      }}
                      className="text-xs bg-red-100 px-2 py-1 rounded hover:bg-red-200"
                    >
                      Test (Set 5)
                    </button>
                  </div>
                  {rating === 0 && (
                    <p className="text-sm text-red-600 font-semibold">⚠ Please select a rating from 1 to 5 stars</p>
                  )}
                  {rating > 0 && (
                    <p className="text-sm text-orange-600 font-semibold">✅ You selected {rating} star{rating > 1 ? 's' : ''}!</p>
                  )}
                </div>
              </div>

              {/* Category Ratings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Detailed Feedback
                </label>
                <div className="space-y-4">
                  {feedback?.categories?.map((category) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">
                        {category.replace('_', ' ')}
                      </span>
                      {renderStars(
                        categoryRatings[category] || 0,
                        true,
                        (rating) => updateCategoryRating(category, rating)
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your thoughts, suggestions, or any specific feedback..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rating === 0}
                  onClick={() => {
                    console.log('Submit button clicked! Rating state:', rating);
                  }}
                  className={`px-6 py-3 rounded-lg transition-all duration-300 font-semibold text-base ${
                    rating === 0
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed opacity-50'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                  }`}
                  title={rating === 0 ? 'Please select a rating first' : 'Submit your feedback'}
                >
                  {rating === 0 ? '⚠ Please Select Rating' : '🚀 Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const GuidelinesModal = ({ onClose }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900">
                Feedback Guidelines
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Introduction */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">📝 Why Your Feedback Matters</h4>
                <p className="text-blue-800 text-sm">
                  Your feedback is essential for continuous improvement of our educational platform. 
                  It helps instructors enhance their teaching methods and helps us provide better learning experiences for all students.
                </p>
              </div>

              {/* Guidelines Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Be Constructive */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="text-orange-500 mr-2">✅</span>
                    Be Constructive
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Focus on specific aspects of the course or instruction</li>
                    <li>• Provide actionable suggestions for improvement</li>
                    <li>• Highlight what worked well alongside areas for improvement</li>
                    <li>• Use clear, specific examples when possible</li>
                  </ul>
                </div>

                {/* Be Respectful */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="text-blue-500 mr-2">🤝</span>
                    Be Respectful
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Use professional and courteous language</li>
                    <li>• Avoid personal attacks or inappropriate comments</li>
                    <li>• Focus on the content, not the person</li>
                    <li>• Consider the instructor's effort and dedication</li>
                  </ul>
                </div>

                {/* Be Specific */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="text-purple-500 mr-2">🎯</span>
                    Be Specific
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Mention specific lessons, assignments, or activities</li>
                    <li>• Explain how content could be improved</li>
                    <li>• Suggest alternative approaches or resources</li>
                    <li>• Rate different aspects thoughtfully</li>
                  </ul>
                </div>

                {/* Be Timely */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="text-orange-500 mr-2">⏰</span>
                    Be Timely
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Submit feedback while the experience is fresh</li>
                    <li>• Respect feedback deadlines</li>
                    <li>• Don't wait until the last minute</li>
                    <li>• Update feedback if circumstances change</li>
                  </ul>
                </div>
              </div>

              {/* Feedback Categories */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">📊 Understanding Feedback Categories</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Course Content</h5>
                    <ul className="space-y-1">
                      <li>• Clarity and organization</li>
                      <li>• Relevance to learning objectives</li>
                      <li>• Difficulty level appropriateness</li>
                      <li>• Quality of materials and resources</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Instructor Performance</h5>
                    <ul className="space-y-1">
                      <li>• Teaching effectiveness</li>
                      <li>• Communication skills</li>
                      <li>• Responsiveness to questions</li>
                      <li>• Engagement and enthusiasm</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Assignments & Assessments</h5>
                    <ul className="space-y-1">
                      <li>• Clear instructions</li>
                      <li>• Fair grading criteria</li>
                      <li>• Timely feedback</li>
                      <li>• Relevance to course goals</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Overall Experience</h5>
                    <ul className="space-y-1">
                      <li>• Course structure and pacing</li>
                      <li>• Technical platform issues</li>
                      <li>• Support and resources</li>
                      <li>• Achievement of learning goals</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Examples */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">💡 Example Feedback</h4>
                
                <div className="border-l-4 border-orange-400 bg-orange-50 p-4">
                  <h5 className="font-medium text-orange-800 mb-2">Good Example:</h5>
                  <p className="text-orange-700 text-sm">
                    "The React module was well-structured and the hands-on projects really helped solidify the concepts. 
                    I especially appreciated the real-world examples in lesson 3. For future iterations, it would be helpful 
                    to have more debugging exercises, as I found that challenging when working on the final project."
                  </p>
                </div>

                <div className="border-l-4 border-red-400 bg-red-50 p-4">
                  <h5 className="font-medium text-red-800 mb-2">Avoid This:</h5>
                  <p className="text-red-700 text-sm">
                    "This course was terrible. The instructor doesn't know what they're doing and the content is boring. 
                    Waste of time."
                  </p>
                  <p className="text-red-600 text-xs mt-2">
                    <em>This feedback is too vague and unconstructive.</em>
                  </p>
                </div>
              </div>

              {/* Call to Action */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-4 text-center">
                <h4 className="font-semibold mb-2">Ready to Provide Feedback?</h4>
                <p className="text-sm opacity-90">
                  Your thoughtful feedback helps create better learning experiences for everyone. 
                  Take a moment to share your insights and help us improve!
                </p>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600">Loading your enrolled courses and feedback...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={() => setShowGuidelinesModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Feedback Guidelines
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <span className="text-orange-500 mr-2">✓</span>
            {success}
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠</span>
            {error}
          </div>
        </div>
      )}

      {/* Feedback Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">💭</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Feedback</p>
              <p className="text-2xl font-bold text-gray-900">{feedbackCounts.all}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{feedbackCounts.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{feedbackCounts.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex space-x-1">
          {[
            { id: 'all', label: 'All', count: feedbackCounts.all },
            { id: 'pending', label: 'Pending', count: feedbackCounts.pending },
            { id: 'completed', label: 'Completed', count: feedbackCounts.completed }
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
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-6">
        {filteredFeedbacks.map((feedback) => (
          <div key={feedback.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className="text-3xl">{getTypeIcon(feedback.type)}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{feedback.title}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Instructor: {feedback.instructor}</div>
                      {feedback.course && <div>Course: {feedback.course}</div>}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(feedback.status)}`}>
                  {feedback.status}
                </span>
              </div>

              {feedback.status === 'pending' && (
                <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Feedback Requested</h4>
                      <p className="text-sm text-gray-600">
                        Your feedback helps improve our courses and teaching quality.
                      </p>
                      {feedback.dueDate && (
                        <p className="text-sm text-gray-500 mt-1">
                          Due: {formatDate(feedback.dueDate)} 
                          {getDaysUntilDue(feedback.dueDate) >= 0 && (
                            <span className="ml-1">
                              ({getDaysUntilDue(feedback.dueDate)} days remaining)
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCourse(feedback);
                        setShowFeedbackModal(true);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Provide Feedback
                    </button>
                  </div>
                </div>
              )}

              {feedback.status === 'completed' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="text-sm text-gray-600">Your Rating:</span>
                      {renderStars(feedback.rating)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Submitted: {formatDate(feedback.submittedDate || feedback.attendedDate)}
                    </div>
                  </div>

                  {feedback.comment && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Your Comment:</h4>
                      <p className="text-gray-700 text-sm">{feedback.comment}</p>
                    </div>
                  )}

                  {feedback.instructorResponse && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Instructor Response:</h4>
                      <p className="text-gray-700 text-sm">{feedback.instructorResponse}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Type: {feedback.type.replace('_', ' ')} • 
                  {feedback.completedDate && ` Completed: ${formatDate(feedback.completedDate)}`}
                  {feedback.attendedDate && ` Attended: ${formatDate(feedback.attendedDate)}`}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredFeedbacks.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💭</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback found</h3>
          <p className="text-gray-600">
            {enrolledCourses.length === 0
              ? "You are not enrolled in any courses yet. Enroll in courses to provide feedback."
              : activeTab === 'pending' 
              ? "You don't have any pending feedback requests for your enrolled courses."
              : "No feedback matches your current filter."
            }
          </p>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedCourse && (
        <FeedbackModal
          feedback={selectedCourse}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedCourse(null);
          }}
          onSubmit={async (feedbackData) => {
            try {
              // Handle feedback submission to API
              console.log('Submitting feedback:', feedbackData);
              
              const userId = getCurrentUserId();
              
              // Validate required fields with detailed error messages
              console.log('Validation check - userId:', userId);
              console.log('Validation check - selectedCourse:', selectedCourse);
              console.log('Validation check - feedbackData:', feedbackData);
              
              if (!userId || userId === 'undefined' || userId === 'null') {
                console.error('User ID validation failed:', userId);
                throw new Error('User ID is required. Please ensure you are logged in. Current user ID: ' + userId);
              }
              
              if (!selectedCourse) {
                throw new Error('Selected course is required.');
              }
              
              // Ensure we have required IDs
              const targetId = selectedCourse.course_id || selectedCourse._id || selectedCourse.id;
              console.log('Validation check - targetId:', targetId);
              if (!targetId || targetId === 'undefined' || targetId === 'null') {
                console.error('Target ID validation failed:', targetId, selectedCourse);
                throw new Error('Course ID is required but not found in selected course.');
              }
              
              const courseTitle = selectedCourse.title || selectedCourse.name;
              console.log('Validation check - courseTitle:', courseTitle);
              if (!courseTitle) {
                throw new Error('Course title is required.');
              }
              
              console.log('Validation check - instructor:', selectedCourse.instructor);
              if (!selectedCourse.instructor) {
                throw new Error('Instructor name is required.');
              }
              
              const rating = parseInt(feedbackData.rating);
              console.log('Validation check - rating:', rating, feedbackData.rating);
              if (isNaN(rating) || rating < 1 || rating > 5) {
                console.error('Rating validation failed:', rating, feedbackData.rating);
                throw new Error(`Valid rating (1-5) is required. Current rating: ${rating}`);
              }
              
              // Prepare feedback data for API submission
              const apiData = {
                user_id: String(userId), // Ensure it's a string
                target_type: 'course',
                target_id: String(targetId), // Ensure it's a string
                target_title: String(courseTitle),
                instructor_id: selectedCourse.instructor_id ? String(selectedCourse.instructor_id) : null,
                instructor_name: String(selectedCourse.instructor),
                course_id: String(targetId),
                course_name: String(selectedCourse.course || selectedCourse.title || selectedCourse.name),
                rating: Math.max(1, Math.min(5, rating)), // Ensure rating is between 1-5
                comment: String(feedbackData.comment || ''),
                categories: Array.isArray(selectedCourse.categories) ? selectedCourse.categories : [],
                category_ratings: feedbackData.categoryRatings || {},
                status: 'completed',
                submitted_date: new Date().toISOString()
              };
              
              console.log('API data to submit:', apiData);
              
              // Submit feedback to the API endpoint
              const response = await feedbackAPI.submitFeedback(apiData);
              console.log('Feedback submitted successfully:', response);
              
              // Update local state to reflect the submitted feedback
              setFeedbacks(prev => 
                prev.map(f => 
                  f.id === selectedCourse.id 
                    ? { 
                        ...f, 
                        status: 'completed', 
                        rating: feedbackData.rating,
                        comment: feedbackData.comment,
                        categoryRatings: feedbackData.categoryRatings,
                        submittedDate: new Date().toISOString()
                      }
                    : f
                )
              );
              
              // Update counts
              setFeedbackCounts(prev => ({
                ...prev,
                pending: prev.pending - 1,
                completed: prev.completed + 1
              }));
              
              setShowFeedbackModal(false);
              setSelectedCourse(null);
              
              // Show success message
              setError(null);
              setSuccess('Feedback submitted successfully! Thank you for your input.');
              
            } catch (error) {
              console.error('Failed to submit feedback:', error);
              console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                selectedCourse: selectedCourse,
                feedbackData: feedbackData,
                userId: getCurrentUserId()
              });
              
              // More descriptive error messages based on error type
              let errorMessage = 'Failed to submit feedback. Please try again.';
              
              if (error.message.includes('User ID')) {
                errorMessage = 'Please log in again and try submitting feedback.';
              } else if (error.message.includes('Course ID')) {
                errorMessage = 'Course information is incomplete. Please refresh the page and try again.';
              } else if (error.message.includes('rating')) {
                errorMessage = 'Please provide a valid rating (1-5 stars) before submitting.';
              } else if (error.message.includes('422')) {
                errorMessage = 'Invalid feedback data. Please check all required fields and try again.';
              } else if (error.message.includes('Network')) {
                errorMessage = 'Network error. Please check your internet connection and try again.';
              }
              
              setError(`${errorMessage} (${error.message})`);
              
              // Don't close modal on error so user can try again
            }
          }}
        />
      )}

      {/* Guidelines Modal */}
      {showGuidelinesModal && (
        <GuidelinesModal
          onClose={() => setShowGuidelinesModal(false)}
        />
      )}

      {/* Feedback Importance Info */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Why Your Feedback Matters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Improve Course Quality</h4>
            <p>Your feedback helps instructors understand what works and what can be improved in their courses.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Help Fellow Students</h4>
            <p>Other students benefit from your insights when choosing courses and setting expectations.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Shape Future Content</h4>
            <p>Constructive feedback influences the development of new courses and learning materials.</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Recognition for Excellence</h4>
            <p>Positive feedback helps recognize outstanding instructors and exceptional course content.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentFeedback;
