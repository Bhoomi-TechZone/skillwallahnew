import React, { useState, useEffect } from 'react';
import studentAssignmentService from '../../services/studentAssignmentService';
import branchStudentDashboardService from '../../services/branchStudentDashboardService';

const StudentAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showSubmissionViewModal, setShowSubmissionViewModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionComments, setSubmissionComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch assignments data from backend
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔐 Authentication Debug:');
        console.log('  - localStorage.token:', localStorage.getItem('token'));
        console.log('  - localStorage.studentToken:', localStorage.getItem('studentToken'));
        console.log('  - localStorage.user:', localStorage.getItem('user'));
        console.log('  - localStorage.authToken:', localStorage.getItem('authToken'));
        console.log('  - All localStorage keys:', Object.keys(localStorage));

        // Check if user data exists
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            console.log('👤 User data:', user);
            console.log('👤 User role:', user.role);
            console.log('👤 User ID:', user._id || user.id);
          } catch (e) {
            console.error('❌ Failed to parse user data:', e);
          }
        } else {
          console.warn('⚠️ No user data found in localStorage');
          setError('Please log in to view assignments');
          setLoading(false);
          return;
        }

        // Check if we have any token
        const hasAnyToken = localStorage.getItem('token') ||
          localStorage.getItem('studentToken') ||
          localStorage.getItem('authToken');

        if (!hasAnyToken) {
          console.warn('⚠️ No authentication token found');
          setError('Authentication required. Please log in again.');
          setLoading(false);
          return;
        }

        console.log('📚 Fetching assignments for student...');

        // Check if this is a branch student
        const isBranchStudent = branchStudentDashboardService.isBranchStudent();
        console.log('🎓 [StudentAssignments] Is branch student:', isBranchStudent);

        let assignmentsData;

        if (isBranchStudent) {
          console.log('🏢 [StudentAssignments] Fetching branch student assignments...');

          try {
            const branchData = await branchStudentDashboardService.getAssignments();
            assignmentsData = branchData.assignments || [];
            console.log('✅ [StudentAssignments] Branch assignments loaded:', assignmentsData);

            // Transform branch assignment data to match expected structure
            assignmentsData = assignmentsData.map(assignment => ({
              ...assignment,
              id: assignment.id || assignment._id,
              _id: assignment.id || assignment._id,
              due_date: assignment.due_date,
              submitted_at: assignment.submitted_at,
              attachments: assignment.attachments || [],
              submission_file: assignment.submission_file
            }));

          } catch (branchError) {
            console.error('❌ [StudentAssignments] Failed to fetch branch assignments:', branchError);
            // Fall back to regular assignment service
            assignmentsData = await studentAssignmentService.getAllAssignments();
          }
        } else {
          // Regular student - use existing service
          assignmentsData = await studentAssignmentService.getAllAssignments();
        }

        console.log('✅ Assignments data received:', assignmentsData);
        console.log(`📊 Total assignments: ${assignmentsData.length}`);

        // Debug: Log attachment information
        assignmentsData.forEach((assignment, index) => {
          console.log(`📋 Assignment ${index + 1}: "${assignment.title}"`);
          console.log(`   - Attachments: [${assignment.attachments?.join(', ') || 'None'}]`);
          console.log(`   - Original path: ${assignment._originalAttachmentPath || 'None'}`);
        });

        setAssignments(assignmentsData);
      } catch (err) {
        console.error('❌ Error fetching assignments:', err);

        // Handle specific authentication errors
        if (err.message.includes('401') || err.message.includes('403') || err.message.includes('Unauthorized') || err.message.includes('Forbidden')) {
          setError('Authentication failed. Please log in again.');
        } else {
          setError(err.message || 'Failed to load assignments');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // Helper function to test token directly
  const testTokenDirectly = async () => {
    console.log('🧪 Testing token directly...');

    // First, manually set up a token
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjhhZmNhNGRmOGQ3YTBjNGM1NzViOWQxIiwicm9sZSI6InN0dWRlbnQiLCJuYW1lIjoiVGVzdCBTdHVkZW50IiwiZW1haWwiOiJ0ZXN0QHN0dWRlbnQuY29tIiwiZXhwIjoxNzYzNzkzODkwfQ.nWwFkc9brECUgB2raxzsQ1Nmnv6w056rTjUjBfhAkKg';
    localStorage.setItem('token', testToken);
    localStorage.setItem('studentToken', testToken);

    console.log('🔐 Token set, testing direct API call...');

    // Now test making a direct API call
    try {
      console.log('📡 Making direct fetch with Authorization header...');
      const response = await fetch('http://localhost:4000/assignments/student/my-assignments?student_id=68afca4df8d7a0c4c575b9d1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`
        }
      });

      console.log('🌐 Direct API test response:', response.status, response.statusText);
      const data = await response.text();
      console.log('📄 Response data:', data);

    } catch (error) {
      console.error('❌ Direct API test failed:', error);
    }
  };

  // Helper function to set up test authentication
  const setupTestAuth = () => {
    console.log('🧪 Setting up test authentication...');

    // Create a mock student user
    const testUser = {
      _id: '68afca4df8d7a0c4c575b9d1',
      id: '68afca4df8d7a0c4c575b9d1',
      email: 'test@student.com',
      role: 'student',
      name: 'Test Student'
    };

    // Use a valid JWT token generated by the backend
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjhhZmNhNGRmOGQ3YTBjNGM1NzViOWQxIiwicm9sZSI6InN0dWRlbnQiLCJuYW1lIjoiVGVzdCBTdHVkZW50IiwiZW1haWwiOiJ0ZXN0QHN0dWRlbnQuY29tIiwiZXhwIjoxNzYzNzkzODkwfQ.nWwFkc9brECUgB2raxzsQ1Nmnv6w056rTjUjBfhAkKg';

    console.log('🔐 Using valid JWT token:', testToken.substring(0, 50) + '...');

    // Clear any existing auth data first
    ['token', 'studentToken', 'authToken', 'user', 'studentUser', 'adminToken', 'instructorToken'].forEach(key => {
      localStorage.removeItem(key);
    });

    // Store authentication data
    localStorage.setItem('token', testToken);
    localStorage.setItem('studentToken', testToken);
    localStorage.setItem('authToken', testToken);
    localStorage.setItem('user', JSON.stringify(testUser));
    localStorage.setItem('studentUser', JSON.stringify(testUser));

    console.log('✅ Test authentication set up with valid JWT token');
    console.log('📋 Stored tokens in localStorage');

    // Reload to try again
    window.location.reload();
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesTab = activeTab === 'all' || assignment.status === activeTab ||
      (activeTab === 'completed' && (assignment.status === 'submitted' || assignment.status === 'graded'));
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.course.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = filterCourse === 'all' || assignment.course === filterCourse;

    return matchesTab && matchesSearch && matchesCourse;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'submitted':
        return 'bg-orange-100 text-orange-800';
      case 'graded':
        return 'bg-purple-100 text-purple-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-orange-100 text-orange-800';
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'Advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate, status) => {
    return new Date(dueDate) < new Date() && status !== 'submitted' && status !== 'graded';
  };

  const getDaysRemaining = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Handle assignment viewing
  const handleViewAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setShowAssignmentModal(true);
  };

  // Handle assignment submission
  const handleStartAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setShowSubmissionModal(true);
    setSubmissionComments('');
    setSubmissionFile(null);
  };

  // Handle viewing submission
  const handleViewSubmission = (assignment) => {
    console.log('📋 Viewing submission for assignment:', assignment.title);
    setSelectedAssignment(assignment);
    setShowSubmissionViewModal(true);
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !submissionFile) {
      alert('Please select a file to submit');
      return;
    }

    try {
      setSubmitting(true);

      await studentAssignmentService.submitAssignment({
        assignment_id: selectedAssignment.id,
        file: submissionFile,
        comments: submissionComments
      });

      // Refresh assignments after submission
      const updatedAssignments = await studentAssignmentService.getAllAssignments();
      setAssignments(updatedAssignments);

      // Trigger dashboard stats refresh for real-time updates
      try {
        // Store completion event for potential dashboard refresh
        localStorage.setItem('assignmentSubmitted', JSON.stringify({
          assignmentId: selectedAssignment.id,
          timestamp: Date.now(),
          assignmentTitle: selectedAssignment.title
        }));

        // Dispatch a custom event that the dashboard can listen to
        window.dispatchEvent(new CustomEvent('assignmentSubmitted', {
          detail: {
            assignmentId: selectedAssignment.id,
            assignmentTitle: selectedAssignment.title
          }
        }));
      } catch (refreshError) {
        console.log('Dashboard refresh notification failed:', refreshError);
      }

      setShowSubmissionModal(false);
      alert('Assignment submitted successfully!');
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('Failed to submit assignment: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadAttachment = async (assignment, attachmentName) => {
    try {
      console.log(`📥 Downloading attachment: ${attachmentName} from assignment: ${assignment.title}`);

      // Get the assignment ID
      const assignmentId = assignment.id;

      // Try to download the file
      const blob = await studentAssignmentService.downloadAssignmentFile(assignmentId, attachmentName);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachmentName;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log(`✅ Downloaded: ${attachmentName}`);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert(`Failed to download attachment: ${error.message}`);
    }
  }; const assignmentCounts = {
    all: assignments.length,
    pending: assignments.filter(a => a.status === 'pending').length,
    'in-progress': assignments.filter(a => a.status === 'in-progress').length,
    completed: assignments.filter(a => a.status === 'submitted' || a.status === 'graded').length
  };

  // Get unique courses for filter dropdown
  const uniqueCourses = [...new Set(assignments.map(a => a.course))].filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading assignments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Assignments</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
          <button
            onClick={testTokenDirectly}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            title="Test direct API call with token"
          >
            🔧 Test API
          </button>
          {(error.includes('Authentication') || error.includes('log in')) && (
            <>
              <button
                onClick={() => window.location.href = '/student/login'}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Go to Login
              </button>
              <button
                onClick={setupTestAuth}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                title="Set up test authentication tokens for debugging"
              >
                🧪 Test Auth
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="text-sm text-gray-600 mt-1">
            Showing published assignments from your enrolled courses
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            View Submission Guidelines
          </button>
        </div>
      </div>

      {/* Assignment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📝</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{assignmentCounts.all}</p>
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
              <p className="text-2xl font-bold text-gray-900">{assignmentCounts.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">🔄</span>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{assignmentCounts['in-progress']}</p>
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
              <p className="text-2xl font-bold text-gray-900">{assignmentCounts.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          {[
            { id: 'all', label: 'All', count: assignmentCounts.all },
            { id: 'pending', label: 'Pending', count: assignmentCounts.pending },
            { id: 'in-progress', label: 'In Progress', count: assignmentCounts['in-progress'] },
            { id: 'completed', label: 'Completed', count: assignmentCounts.completed }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Assignments</label>
            <input
              type="text"
              placeholder="Search by title or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Course</label>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Courses</option>
              {uniqueCourses.map((course, index) => (
                <option key={index} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-6">
        {filteredAssignments.map((assignment) => (
          <div key={assignment.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-6">
              {/* Assignment Header */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3
                      className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => handleViewAssignment(assignment)}
                      title="Click to view full assignment details"
                    >
                      {assignment.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      isOverdue(assignment.dueDate, assignment.status) ? 'overdue' : assignment.status
                    )}`}>
                      {isOverdue(assignment.dueDate, assignment.status) ? 'Overdue' : assignment.status.replace('-', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(assignment.difficulty)}`}>
                      {assignment.difficulty}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{assignment.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>📚 {assignment.course}</span>
                    <span>👨‍🏫 {assignment.instructor}</span>
                    <span>⭐ {assignment.points} points</span>
                  </div>
                </div>

                <div className="mt-4 lg:mt-0 lg:text-right">
                  <div className="text-sm text-gray-600">
                    Due: {assignment.dueDate}
                  </div>
                  {assignment.status !== 'submitted' && assignment.status !== 'graded' && (
                    <div className={`text-sm font-medium ${getDaysRemaining(assignment.dueDate) < 0 ? 'text-red-600' :
                      getDaysRemaining(assignment.dueDate) <= 3 ? 'text-yellow-600' : 'text-orange-600'
                      }`}>
                      {getDaysRemaining(assignment.dueDate) < 0
                        ? `${Math.abs(getDaysRemaining(assignment.dueDate))} days overdue`
                        : `${getDaysRemaining(assignment.dueDate)} days remaining`
                      }
                    </div>
                  )}
                  {assignment.submittedDate && (
                    <div className="text-sm text-orange-600">
                      Submitted: {assignment.submittedDate}
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment Details */}
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Requirements:</h4>
                    <ul className="space-y-1">
                      {assignment.requirements.map((req, index) => (
                        <li key={`req-${index}-${req.substring(0, 10)}`} className="text-sm text-gray-600 flex items-start">
                          <span className="text-orange-500 mr-2">•</span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Time Allowed: </span>
                        <span className="text-sm text-gray-600">{assignment.timeAllowed}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Submission Format: </span>
                        <span className="text-sm text-gray-600">{assignment.submissionFormat}</span>
                      </div>
                      {assignment.attachments.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Attachments: </span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {assignment.attachments.map((file, index) => (
                              <button
                                key={`attachment-${index}-${file.substring(0, 10)}`}
                                onClick={() => handleDownloadAttachment(assignment, file)}
                                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                              >
                                📎 {file}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score and Feedback */}
                {assignment.score && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">Score: {assignment.score}/{assignment.points}</span>
                      <span className={`font-medium ${assignment.score >= 90 ? 'text-orange-600' :
                        assignment.score >= 70 ? 'text-blue-600' : 'text-yellow-600'}`}>
                        {Math.round((assignment.score / assignment.points) * 100)}%
                      </span>
                    </div>
                    {assignment.feedback && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Feedback: </span>
                        <p className="text-sm text-gray-600 mt-1">{assignment.feedback}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between items-center mt-4">
                  <button
                    onClick={() => handleViewAssignment(assignment)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    📖 View Assignment
                  </button>

                  <div className="flex space-x-3">
                    {assignment.status === 'pending' && (
                      <button
                        onClick={() => handleStartAssignment(assignment)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Start Assignment
                      </button>
                    )}
                    {assignment.status === 'in-progress' && (
                      <>
                        <button className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                          Save Draft
                        </button>
                        <button
                          onClick={() => handleStartAssignment(assignment)}
                          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          Submit Assignment
                        </button>
                      </>
                    )}
                    {(assignment.status === 'submitted' || assignment.status === 'graded') && (
                      <button
                        onClick={() => handleViewSubmission(assignment)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View Submission
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAssignments.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
          <p className="text-gray-600">No assignments match your current filters.</p>
        </div>
      )}

      {/* Submission Modal */}
      {showSubmissionModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Submit Assignment
              </h3>
              <button
                onClick={() => setShowSubmissionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">{selectedAssignment.title}</h4>
              <p className="text-sm text-gray-600">{selectedAssignment.course}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File *
                </label>
                <input
                  type="file"
                  onChange={(e) => setSubmissionFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Accepted formats: PDF, DOC, DOCX, TXT, ZIP, RAR (Max 10MB)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (Optional)
                </label>
                <textarea
                  value={submissionComments}
                  onChange={(e) => setSubmissionComments(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any comments or notes about your submission..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSubmissionModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAssignment}
                disabled={!submissionFile || submitting}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Details Modal */}
      {showAssignmentModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedAssignment.title}
              </h2>
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Assignment Info Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-gray-700">Course:</span>
                <p className="font-semibold text-gray-900">📚 {selectedAssignment.course}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Instructor:</span>
                <p className="font-semibold text-gray-900">👨‍🏫 {selectedAssignment.instructor}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Due Date:</span>
                <p className="font-semibold text-gray-900">📅 {selectedAssignment.dueDate}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Points:</span>
                <p className="font-semibold text-gray-900">⭐ {selectedAssignment.points}</p>
              </div>
            </div>

            {/* Status and Difficulty Badges */}
            <div className="flex items-center space-x-3 mb-6">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                isOverdue(selectedAssignment.dueDate, selectedAssignment.status) ? 'overdue' : selectedAssignment.status
              )}`}>
                {isOverdue(selectedAssignment.dueDate, selectedAssignment.status) ? 'Overdue' : selectedAssignment.status.replace('-', ' ')}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(selectedAssignment.difficulty)}`}>
                {selectedAssignment.difficulty}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {selectedAssignment.timeAllowed}
              </span>
            </div>

            {/* Assignment Description */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-700 leading-relaxed">{selectedAssignment.description}</p>
              </div>
            </div>

            {/* Assignment Requirements */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h3>
              <div className="space-y-2">
                {selectedAssignment.requirements.map((req, index) => (
                  <div key={`req-${index}`} className="flex items-start p-3 bg-orange-50 rounded-lg">
                    <span className="text-orange-500 mr-3 mt-1">✓</span>
                    <span className="text-gray-700">{req}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Submission Guidelines */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Submission Guidelines</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">📁 Submission Format</h4>
                  <p className="text-gray-600">{selectedAssignment.submissionFormat}</p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">⏰ Time Limit</h4>
                  <p className="text-gray-600">{selectedAssignment.timeAllowed}</p>
                </div>
              </div>
            </div>

            {/* Attachments */}
            {selectedAssignment.attachments && selectedAssignment.attachments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Assignment Files</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedAssignment.attachments.map((file, index) => (
                    <button
                      key={`attachment-${index}`}
                      onClick={() => handleDownloadAttachment(selectedAssignment, file)}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="text-blue-500 mr-3 text-xl">📎</span>
                      <div>
                        <p className="font-medium text-gray-900">{file}</p>
                        <p className="text-sm text-gray-500">Click to download</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Score and Feedback (if graded) */}
            {selectedAssignment.score && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Score</h3>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-bold text-purple-900">
                    {selectedAssignment.score}/{selectedAssignment.points}
                  </span>
                  <span className={`text-xl font-bold ${selectedAssignment.score >= 90 ? 'text-orange-600' :
                    selectedAssignment.score >= 70 ? 'text-blue-600' : 'text-yellow-600'}`}>
                    {Math.round((selectedAssignment.score / selectedAssignment.points) * 100)}%
                  </span>
                </div>
                {selectedAssignment.feedback && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Instructor Feedback:</h4>
                    <p className="text-gray-700 bg-white p-3 rounded border">{selectedAssignment.feedback}</p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>

              {selectedAssignment.status === 'pending' && (
                <button
                  onClick={() => {
                    setShowAssignmentModal(false);
                    handleStartAssignment(selectedAssignment);
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🚀 Start Assignment
                </button>
              )}

              {selectedAssignment.status === 'in-progress' && (
                <button
                  onClick={() => {
                    setShowAssignmentModal(false);
                    handleStartAssignment(selectedAssignment);
                  }}
                  className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  📤 Submit Assignment
                </button>
              )}

              {(selectedAssignment.status === 'submitted' || selectedAssignment.status === 'graded') && (
                <button
                  onClick={() => {
                    setShowAssignmentModal(false);
                    handleViewSubmission(selectedAssignment);
                  }}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  📋 View My Submission
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submission View Modal */}
      {showSubmissionViewModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                📋 Your Submission
              </h2>
              <button
                onClick={() => setShowSubmissionViewModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Assignment Info */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">{selectedAssignment.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                <div>
                  <span className="font-medium">Course:</span> {selectedAssignment.course}
                </div>
                <div>
                  <span className="font-medium">Due Date:</span> {selectedAssignment.dueDate}
                </div>
                <div>
                  <span className="font-medium">Points:</span> {selectedAssignment.points}
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedAssignment.status)}`}>
                    {selectedAssignment.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Submission Details */}
            {selectedAssignment.submission ? (
              <div className="space-y-4">
                {/* Submission Info */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">📤 Submission Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Submitted Date:</span>
                      <p className="text-gray-600">{selectedAssignment.submission.submitted_date || 'Unknown'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">File Name:</span>
                      <p className="text-gray-600">{selectedAssignment.submission.file_name || 'No file name'}</p>
                    </div>
                  </div>

                  {selectedAssignment.submission.comments && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-700">Your Comments:</span>
                      <p className="text-gray-600 mt-1 p-2 bg-gray-50 rounded">{selectedAssignment.submission.comments}</p>
                    </div>
                  )}
                </div>

                {/* Grading Information */}
                {selectedAssignment.submission.grade !== null && selectedAssignment.submission.grade !== undefined ? (
                  <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-3">🏆 Grading Results</h4>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-orange-900">
                        Score: {selectedAssignment.submission.grade}/{selectedAssignment.points}
                      </span>
                      <span className={`text-lg font-bold ${(selectedAssignment.submission.grade / selectedAssignment.points) * 100 >= 90 ? 'text-orange-600' :
                        (selectedAssignment.submission.grade / selectedAssignment.points) * 100 >= 70 ? 'text-blue-600' : 'text-yellow-600'
                        }`}>
                        {Math.round((selectedAssignment.submission.grade / selectedAssignment.points) * 100)}%
                      </span>
                    </div>

                    {selectedAssignment.submission.feedback && (
                      <div>
                        <span className="font-medium text-orange-900">Instructor Feedback:</span>
                        <p className="text-orange-800 mt-1 p-3 bg-white rounded border border-orange-200">{selectedAssignment.submission.feedback}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2">⏳ Pending Review</h4>
                    <p className="text-yellow-800">Your submission is waiting to be reviewed by the instructor.</p>
                  </div>
                )}

                {/* Download Submitted File */}
                {selectedAssignment.submission.file_path && (
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">📁 Your Submitted File</h4>
                    <button
                      onClick={() => {
                        // TODO: Add download functionality for submitted file
                        alert('Download functionality for submitted files will be implemented soon');
                      }}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      <span className="mr-2">📥</span>
                      Download Your Submission
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Submission Found</h3>
                <p className="text-gray-600 mb-4">You haven't submitted this assignment yet.</p>
                <button
                  onClick={() => {
                    setShowSubmissionViewModal(false);
                    handleStartAssignment(selectedAssignment);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit Assignment Now
                </button>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowSubmissionViewModal(false)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
