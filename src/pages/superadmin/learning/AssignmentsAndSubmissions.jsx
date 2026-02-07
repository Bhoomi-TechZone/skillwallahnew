import React, { useState, useEffect, useMemo } from 'react';
import { FaClipboardList, FaFileAlt, FaEye, FaEdit, FaTrash, FaDownload, FaPlus, FaSpinner, FaTimes, FaSave, FaCalendarAlt, FaClock, FaUser, FaBook, FaBars } from 'react-icons/fa';
import SuperAdminSidebar from '../SuperAdminSidebar';
import { useNavigate } from 'react-router-dom';

const AssignmentsAndSubmissions = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [activeTab, setActiveTab] = useState('assignments');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({ type: null, id: null });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [gradeForm, setGradeForm] = useState({});
  const [currentPageAssignments, setCurrentPageAssignments] = useState(1);
  const [currentPageSubmissions, setCurrentPageSubmissions] = useState(1);
  const [itemsPerPage] = useState(10);

  // Ensure arrays are always valid
  const safeAssignments = Array.isArray(assignments) ? assignments : [];
  const safeSubmissions = Array.isArray(submissions) ? submissions : [];

  // Pagination for assignments
  const totalPagesAssignments = Math.ceil(safeAssignments.length / itemsPerPage);
  const indexOfLastItemAssignments = currentPageAssignments * itemsPerPage;
  const indexOfFirstItemAssignments = indexOfLastItemAssignments - itemsPerPage;
  const currentAssignments = safeAssignments.slice(indexOfFirstItemAssignments, indexOfLastItemAssignments);

  // Pagination for submissions
  const totalPagesSubmissions = Math.ceil(safeSubmissions.length / itemsPerPage);
  const indexOfLastItemSubmissions = currentPageSubmissions * itemsPerPage;
  const indexOfFirstItemSubmissions = indexOfLastItemSubmissions - itemsPerPage;
  const currentSubmissions = safeSubmissions.slice(indexOfFirstItemSubmissions, indexOfLastItemSubmissions);

  // Reset to page 1 when tab changes
  useEffect(() => {
    if (activeTab === 'assignments') {
      setCurrentPageAssignments(1);
    } else {
      setCurrentPageSubmissions(1);
    }
  }, [activeTab]);

  const paginateAssignments = (pageNumber) => setCurrentPageAssignments(pageNumber);
  const nextPageAssignments = () => setCurrentPageAssignments(prev => Math.min(prev + 1, totalPagesAssignments));
  const prevPageAssignments = () => setCurrentPageAssignments(prev => Math.max(prev - 1, 1));

  const paginateSubmissions = (pageNumber) => setCurrentPageSubmissions(pageNumber);
  const nextPageSubmissions = () => setCurrentPageSubmissions(prev => Math.min(prev + 1, totalPagesSubmissions));
  const prevPageSubmissions = () => setCurrentPageSubmissions(prev => Math.max(prev - 1, 1));

  // Normalize selectedItem to ensure all properties are primitives
  const safeSelectedItem = useMemo(() => {
    if (!selectedItem) return null;

    return {
      id: selectedItem.id ? String(selectedItem.id) : null,
      title: String(selectedItem.title || ''),
      description: String(selectedItem.description || ''),
      instructions: String(selectedItem.instructions || ''),
      student_name: String(selectedItem.student_name || ''),
      student_email: String(selectedItem.student_email || ''),
      assignment_title: String(selectedItem.assignment_title || ''),
      course_title: String(selectedItem.course_title || ''),
      instructor_name: String(selectedItem.instructor_name || ''),
      status: String(selectedItem.status || ''),
      visibility: String(selectedItem.visibility || ''),
      grade: selectedItem.grade ? String(selectedItem.grade) : null,
      feedback: String(selectedItem.feedback || ''),
      comments: String(selectedItem.comments || ''),
      file_path: String(selectedItem.file_path || ''),
      max_points: Number(selectedItem.max_points) || 0,
      submission_count: Number(selectedItem.submission_count) || 0,
      estimated_time: Number(selectedItem.estimated_time) || 0,
      due_date: selectedItem.due_date ? String(selectedItem.due_date) : null,
      submitted_at: selectedItem.submitted_at ? String(selectedItem.submitted_at) : null,
      course_id: selectedItem.course_id ? String(selectedItem.course_id) : null,
      student_id: selectedItem.student_id ? String(selectedItem.student_id) : null,
      assignment_id: selectedItem.assignment_id ? String(selectedItem.assignment_id) : null
    };
  }, [selectedItem]);

  // Button handler functions
  const handleViewAssignment = async (assignment) => {
    console.log('👁️ Viewing assignment:', String(assignment?.title || 'Unknown'));
    // Normalize assignment data
    const normalizedAssignment = {
      id: assignment.id ? String(assignment.id) : null,
      title: String(assignment.title || ''),
      description: String(assignment.description || ''),
      instructions: String(assignment.instructions || ''),
      course_title: String(assignment.course_title || ''),
      course_name: String(assignment.course_name || ''),
      instructor_name: String(assignment.instructor_name || ''),
      status: String(assignment.status || 'draft'),
      visibility: String(assignment.visibility || 'draft'),
      max_points: Number(assignment.max_points) || 0,
      submission_count: Number(assignment.submission_count) || 0,
      estimated_time: Number(assignment.estimated_time) || 0,
      due_date: assignment.due_date ? String(assignment.due_date) : null,
      course_id: assignment.course_id ? String(assignment.course_id) : null
    };
    setSelectedItem(normalizedAssignment);
    setShowViewModal(true);
  };

  const handleEditAssignment = async (assignment) => {
    console.log('✏️ Editing assignment:', String(assignment?.title || 'Unknown'));
    // Normalize assignment data before setting
    const normalizedAssignment = {
      id: assignment.id ? String(assignment.id) : null,
      title: String(assignment.title || ''),
      description: String(assignment.description || ''),
      instructions: String(assignment.instructions || ''),
      course_id: assignment.course_id ? String(assignment.course_id) : '',
      visibility: String(assignment.visibility || 'draft'),
      max_points: Number(assignment.max_points) || 100,
      due_date: assignment.due_date ? String(assignment.due_date) : '',
      status: String(assignment.status || 'draft'),
      course_title: String(assignment.course_title || ''),
      instructor_name: String(assignment.instructor_name || '')
    };
    setSelectedItem(normalizedAssignment);
    setEditForm({
      title: String(assignment.title || ''),
      description: String(assignment.description || ''),
      instructions: String(assignment.instructions || ''),
      max_points: Number(assignment.max_points) || 100,
      due_date: assignment.due_date ? String(assignment.due_date) : '',
      course_id: assignment.course_id ? String(assignment.course_id) : '',
      visibility: String(assignment.visibility || 'draft')
    });
    setShowEditModal(true);
  };

  const handleDeleteAssignment = async (assignment) => {
    if (window.confirm(`Are you sure you want to delete "${String(assignment?.title || 'this assignment')}"?`)) {
      setActionLoading({ type: 'delete', id: String(assignment.id) });

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:4000/assignments/${String(assignment?.id || '')}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          console.log('🗑️ Assignment deleted successfully');
          setAssignments(prev => prev.filter(a => String(a?.id) !== String(assignment?.id)));
          alert('Assignment deleted successfully!');
        } else {
          throw new Error('Failed to delete assignment');
        }
      } catch (error) {
        console.error('Error deleting assignment:', error);
        alert('Failed to delete assignment. Please try again.');
      } finally {
        setActionLoading({ type: null, id: null });
      }
    }
  };

  const handleSaveEdit = async () => {
    setActionLoading({ type: 'save', id: safeSelectedItem?.id ? String(safeSelectedItem.id) : null });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/assignments/${String(safeSelectedItem?.id || '')}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        console.log('💾 Assignment updated successfully');
        // Update the assignment in the list
        setAssignments(prev => prev.map(a =>
          String(a?.id) === String(safeSelectedItem?.id)
            ? { ...a, ...editForm }
            : a
        ));
        setShowEditModal(false);
        alert('Assignment updated successfully!');
      } else {
        throw new Error('Failed to update assignment');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      alert('Failed to update assignment. Please try again.');
    } finally {
      setActionLoading({ type: null, id: null });
    }
  };

  const handleSaveCreate = async () => {
    setActionLoading({ type: 'create', id: 'new' });

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      // Append all form fields
      formData.append('title', editForm.title);
      formData.append('description', editForm.description || '');
      formData.append('instructions', editForm.instructions || '');
      formData.append('type', editForm.type || 'exercise');
      formData.append('max_points', editForm.max_points || 100);
      formData.append('due_date', editForm.due_date);
      formData.append('course_id', editForm.course_id);
      formData.append('assigned_students', '[]');
      formData.append('visibility', editForm.visibility || 'draft');
      formData.append('estimated_time', editForm.estimated_time || 1);

      const response = await fetch('http://localhost:4000/assignments/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Assignment created successfully:', result);

        // Refresh assignments list
        const assignmentsResponse = await fetch('http://localhost:4000/assignments/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json();
          setAssignments(assignmentsData.assignments || []);
        }

        setShowCreateModal(false);
        alert('Assignment created successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create assignment');
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('Failed to create assignment: ' + error.message);
    } finally {
      setActionLoading({ type: null, id: null });
    }
  };

  const handleGradeSubmission = (submission) => {
    console.log('📝 Grading submission:', String(submission?.assignment_title || 'Unknown'));
    // Normalize submission data
    const normalizedSubmission = {
      id: submission.id ? String(submission.id) : null,
      student_name: String(submission.student_name || 'Unknown'),
      student_email: String(submission.student_email || ''),
      assignment_title: String(submission.assignment_title || 'Unknown'),
      status: String(submission.status || 'submitted'),
      grade: submission.grade ? String(submission.grade) : '',
      feedback: String(submission.feedback || ''),
      submitted_at: submission.submitted_at ? String(submission.submitted_at) : null,
      student_id: submission.student_id ? String(submission.student_id) : null,
      assignment_id: submission.assignment_id ? String(submission.assignment_id) : null
    };
    setSelectedItem(normalizedSubmission);
    setGradeForm({
      grade: String(normalizedSubmission.grade || ''),
      feedback: String(normalizedSubmission.feedback || ''),
      status: normalizedSubmission.status || 'submitted'
    });
    setShowGradeModal(true);
  };

  const handleSaveGrade = async () => {
    setActionLoading({ type: 'grade', id: safeSelectedItem?.id ? String(safeSelectedItem.id) : null });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/submissions/${String(safeSelectedItem?.id || '')}/grade`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grade: gradeForm.grade,
          feedback: gradeForm.feedback,
          status: 'graded'
        })
      });

      if (response.ok) {
        console.log('✅ Grade saved successfully');

        // Update the submission in the list
        setSubmissions(prev => prev.map(s =>
          String(s?.id) === String(safeSelectedItem?.id)
            ? {
              ...s,
              grade: gradeForm.grade,
              feedback: gradeForm.feedback,
              status: 'graded'
            }
            : s
        ));

        // Also update selectedItem if submission modal is open
        setSelectedItem(prev => ({
          ...prev,
          grade: gradeForm.grade,
          feedback: gradeForm.feedback,
          status: 'graded'
        }));

        setShowGradeModal(false);
        alert('Grade saved successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save grade');
      }
    } catch (error) {
      console.error('Error saving grade:', error);
      alert('Failed to save grade: ' + error.message);
    } finally {
      setActionLoading({ type: null, id: null });
    }
  };

  const closeModals = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setShowCreateModal(false);
    setShowSubmissionModal(false);
    setShowGradeModal(false);
    setSelectedItem(null);
    setEditForm({});
    setGradeForm({});
  };

  const handleViewSubmission = async (submission) => {
    console.log('👁️ Viewing submission:', String(submission?.assignment_title || 'Unknown'));
    // Normalize submission data
    const normalizedSubmission = {
      id: submission.id ? String(submission.id) : null,
      student_name: String(submission.student_name || 'Unknown'),
      student_email: String(submission.student_email || ''),
      assignment_title: String(submission.assignment_title || 'Unknown'),
      course_title: String(submission.course_title || ''),
      status: String(submission.status || 'pending'),
      grade: submission.grade ? String(submission.grade) : null,
      feedback: String(submission.feedback || ''),
      comments: String(submission.comments || ''),
      file_path: String(submission.file_path || ''),
      student_id: submission.student_id ? String(submission.student_id) : '',
      assignment_id: submission.assignment_id ? String(submission.assignment_id) : '',
      submitted_at: submission.submitted_at ? String(submission.submitted_at) : null
    };
    setSelectedItem(normalizedSubmission);
    setShowSubmissionModal(true);
  };

  const handleDownloadSubmission = async (submission) => {
    setActionLoading({ type: 'download', id: submission?.id ? String(submission.id) : null });

    try {
      console.log('💾 Downloading submission for:', String(submission?.student_name || 'Unknown'));

      // Simulate file download
      const fileName = `${String(submission.student_name || 'student')}_${String(submission.assignment_title || 'assignment')}.pdf`.replace(/ /g, '_');

      // In real implementation, this would fetch the actual file
      const demoContent = `Submission by ${String(submission.student_name || 'Unknown')}\nAssignment: ${String(submission.assignment_title || 'Unknown')}\nSubmitted: ${submission.submitted_at ? new Date(String(submission.submitted_at)).toLocaleString() : 'N/A'}`;

      const blob = new Blob([demoContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('✅ Submission downloaded successfully!');
    } catch (error) {
      console.error('Error downloading submission:', error);
      alert('Failed to download submission. Please try again.');
    } finally {
      setActionLoading({ type: null, id: null });
    }
  };

  const handleCreateAssignment = () => {
    console.log('➕ Creating new assignment');
    setEditForm({
      title: '',
      description: '',
      instructions: '',
      max_points: 100,
      due_date: '',
      course_id: '',
      visibility: 'draft',
      type: 'exercise',
      estimated_time: 1
    });
    setShowCreateModal(true);
  };

  const handleExportReport = async () => {
    setActionLoading({ type: 'export', id: 'report' });

    try {
      console.log('📊 Exporting assignments and submissions report...');

      // Generate CSV content
      const csvContent = [
        ['Type', 'Title', 'Course', 'Instructor', 'Due Date', 'Submissions', 'Status'],
        ...assignments.map(a => [
          'Assignment',
          a.title,
          a.course_title,
          a.instructor_name,
          a.due_date ? new Date(String(a.due_date)).toLocaleDateString() : 'N/A',
          a.submission_count,
          a.status
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assignments_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('📊 Report exported successfully!');
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setActionLoading({ type: null, id: null });
    }
  };

  // Load assignments and submissions on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');

        // Fetch assignments
        const assignmentsResponse = await fetch('http://localhost:4000/assignments/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json();
          console.log('📊 Assignments API Response:', assignmentsData);
          console.log('📊 Raw assignments array:', assignmentsData.assignments);

          // Normalize data to ensure all properties are primitives
          const normalizedAssignments = (assignmentsData.assignments || []).map((a, index) => {
            console.log(`Processing assignment ${index}:`, a);
            return {
              id: a.id ? String(a.id) : null,
              title: String(a.title || ''),
              description: String(a.description || ''),
              instructions: String(a.instructions || ''),
              course_title: String(a.course_title || ''),
              instructor_name: String(a.instructor_name || ''),
              due_date: a.due_date ? String(a.due_date) : null,
              submission_count: Number(a.submission_count) || 0,
              status: String(a.status || 'draft'),
              max_points: Number(a.max_points) || 100,
              course_id: a.course_id ? String(a.course_id) : null,
              visibility: String(a.visibility || 'draft')
            };
          });
          console.log('✅ Normalized assignments:', normalizedAssignments);
          setAssignments(normalizedAssignments);
        } else {
          console.error('Failed to fetch assignments:', assignmentsResponse.statusText);
        }

        // Fetch submissions
        const submissionsResponse = await fetch('http://localhost:4000/submissions/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (submissionsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          console.log('📊 Submissions API Response:', submissionsData);
          console.log('📊 Raw submissions array:', submissionsData.submissions);

          // Normalize data to ensure all properties are primitives
          const normalizedSubmissions = (submissionsData.submissions || []).map((s, index) => {
            console.log(`Processing submission ${index}:`, s);
            return {
              id: s.id ? String(s.id) : null,
              student_name: String(s.student_name || 'Unknown'),
              student_email: String(s.student_email || ''),
              assignment_title: String(s.assignment_title || 'Unknown'),
              submitted_at: s.submitted_at ? String(s.submitted_at) : null,
              status: String(s.status || 'pending'),
              grade: s.grade ? String(s.grade) : null,
              feedback: String(s.feedback || ''),
              student_id: s.student_id ? String(s.student_id) : null,
              assignment_id: s.assignment_id ? String(s.assignment_id) : null
            };
          });
          console.log('✅ Normalized submissions:', normalizedSubmissions);
          setSubmissions(normalizedSubmissions);
        } else {
          console.error('Failed to fetch submissions:', submissionsResponse.statusText);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        console.error('Error details:', error.message);
        // Set empty arrays as fallback to prevent undefined errors
        setAssignments([]);
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-amber-50/50 via-yellow-50/50 to-orange-50/50">
      <SuperAdminSidebar
        isOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeMenuItem="Assignments & Submissions"
        setActiveMenuItem={() => { }}
      />
      <div className={`flex-1 h-screen overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'sm:ml-80 md:ml-72 lg:ml-72' : ''}`}>
        <div className="lg:hidden bg-white border-b p-4 flex items-center sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 p-2">
            <FaBars className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold ml-4 bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">Assignments & Submissions</h1>
        </div>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-700 via-orange-600 to-yellow-700 bg-clip-text text-transparent mb-2">
                Assignments & Submissions
              </h1>
              <p className="text-amber-600">Manage course assignments and student submissions</p>
            </div>

            {/* Action Buttons */}
            <div className="mb-6 flex flex-wrap gap-4">
              <button
                onClick={handleCreateAssignment}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center space-x-2"
              >
                <FaPlus />
                <span>Create Assignment</span>
              </button>
              <button
                onClick={handleExportReport}
                disabled={actionLoading.type === 'export'}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {actionLoading.type === 'export' ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                <span>Export Report</span>
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6">
              <div className="flex space-x-1 bg-white/80 p-1 rounded-lg border border-amber-200">
                <button
                  onClick={() => setActiveTab('assignments')}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${activeTab === 'assignments'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    : 'text-amber-700 hover:bg-amber-100'
                    }`}
                >
                  <FaClipboardList />
                  <span>Assignments ({assignments.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('submissions')}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${activeTab === 'submissions'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    : 'text-amber-700 hover:bg-amber-100'
                    }`}
                >
                  <FaFileAlt />
                  <span>Submissions ({submissions.length})</span>
                </button>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="bg-white/80 rounded-2xl p-8 text-center border border-amber-200">
                <FaSpinner className="animate-spin text-3xl text-amber-500 mx-auto mb-4" />
                <p className="text-amber-700">Loading data...</p>
              </div>
            ) : (
              <div className="bg-white/80 rounded-2xl border border-amber-200 overflow-hidden">
                {activeTab === 'assignments' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-amber-100 to-orange-100">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-amber-900 uppercase">Assignment</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-amber-900 uppercase">Course</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-amber-900 uppercase">Instructor</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-amber-900 uppercase">Due Date</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-amber-900 uppercase">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-amber-900 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {currentAssignments.length > 0 ? currentAssignments.map((assignment, index) => (
                          <tr key={`assignment-${String(assignment?.id || index)}`} className="hover:bg-amber-50/50">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-bold text-amber-900">{String(assignment.title || '')}</p>
                                <p className="text-sm text-amber-600">{String(assignment.description || '')}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                                {String(assignment.course_title || 'N/A')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-amber-900">{String(assignment.instructor_name || 'N/A')}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-amber-900">{assignment.due_date ? new Date(String(assignment.due_date)).toLocaleDateString() : 'No date'}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-bold ${String(assignment.status) === 'active' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {String(assignment.status || 'draft')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleViewAssignment(assignment)}
                                  className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
                                  title="View Assignment"
                                >
                                  <FaEye />
                                </button>
                                <button
                                  onClick={() => handleEditAssignment(assignment)}
                                  className="bg-amber-500 text-white p-2 rounded-lg hover:bg-amber-600 transition-colors"
                                  title="Edit Assignment"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  onClick={() => handleDeleteAssignment(assignment)}
                                  disabled={actionLoading.type === 'delete' && String(actionLoading.id) === String(assignment?.id)}
                                  className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                                  title="Delete Assignment"
                                >
                                  {actionLoading.type === 'delete' && String(actionLoading.id) === String(assignment?.id) ? (
                                    <FaSpinner className="animate-spin" />
                                  ) : (
                                    <FaTrash />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="6" className="px-6 py-8 text-center text-amber-700">
                              No assignments found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-amber-100 to-orange-100">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-amber-900 uppercase">Student</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-amber-900 uppercase">Assignment</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-amber-900 uppercase">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-amber-900 uppercase">Grade</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-amber-900 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {currentSubmissions.length > 0 ? currentSubmissions.map((submission, index) => (
                          <tr key={`submission-${String(submission?.id || index)}`} className="hover:bg-amber-50/50">
                            <td className="px-6 py-4">
                              <p className="font-bold text-amber-900">{String(submission.student_name || 'Unknown')}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-amber-900">{String(submission.assignment_title || 'Unknown')}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-bold ${String(submission.status) === 'submitted' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {String(submission.status || 'pending')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-bold text-orange-600">{String(submission.grade || 'Not graded')}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleViewSubmission(submission)}
                                  className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
                                  title="View Submission Details"
                                >
                                  <FaEye />
                                </button>
                                <button
                                  onClick={() => handleDownloadSubmission(submission)}
                                  disabled={actionLoading.type === 'download' && String(actionLoading.id) === String(submission?.id)}
                                  className="bg-orange-500 text-white p-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                                  title="Download Submission"
                                >
                                  {actionLoading.type === 'download' && String(actionLoading.id) === String(submission?.id) ? (
                                    <FaSpinner className="animate-spin" />
                                  ) : (
                                    <FaDownload />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="5" className="px-6 py-8 text-center text-amber-700">
                              No submissions found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination for Assignments */}
                {activeTab === 'assignments' && safeAssignments.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-200 px-6 py-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-amber-800">
                        Showing <span className="font-semibold text-orange-700">{indexOfFirstItemAssignments + 1}</span> to{' '}
                        <span className="font-semibold text-orange-700">{Math.min(indexOfLastItemAssignments, safeAssignments.length)}</span> of{' '}
                        <span className="font-semibold text-orange-700">{safeAssignments.length}</span> assignments
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={prevPageAssignments}
                          disabled={currentPageAssignments === 1}
                          className="px-3 py-2 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                        >
                          Previous
                        </button>
                        <div className="flex gap-1">
                          {[...Array(totalPagesAssignments)].map((_, index) => {
                            const pageNumber = index + 1;
                            if (
                              pageNumber === 1 ||
                              pageNumber === totalPagesAssignments ||
                              (pageNumber >= currentPageAssignments - 1 && pageNumber <= currentPageAssignments + 1)
                            ) {
                              return (
                                <button
                                  key={pageNumber}
                                  onClick={() => paginateAssignments(pageNumber)}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentPageAssignments === pageNumber
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                                    : 'border border-amber-300 bg-white hover:bg-amber-50 text-amber-700'
                                    }`}
                                >
                                  {pageNumber}
                                </button>
                              );
                            } else if (
                              pageNumber === currentPageAssignments - 2 ||
                              pageNumber === currentPageAssignments + 2
                            ) {
                              return (
                                <span key={pageNumber} className="px-2 py-2 text-amber-400">
                                  ...
                                </span>
                              );
                            }
                            return null;
                          })}
                        </div>
                        <button
                          onClick={nextPageAssignments}
                          disabled={currentPageAssignments === totalPagesAssignments}
                          className="px-3 py-2 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pagination for Submissions */}
                {activeTab === 'submissions' && safeSubmissions.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-200 px-6 py-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-amber-800">
                        Showing <span className="font-semibold text-orange-700">{indexOfFirstItemSubmissions + 1}</span> to{' '}
                        <span className="font-semibold text-orange-700">{Math.min(indexOfLastItemSubmissions, safeSubmissions.length)}</span> of{' '}
                        <span className="font-semibold text-orange-700">{safeSubmissions.length}</span> submissions
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={prevPageSubmissions}
                          disabled={currentPageSubmissions === 1}
                          className="px-3 py-2 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                        >
                          Previous
                        </button>
                        <div className="flex gap-1">
                          {[...Array(totalPagesSubmissions)].map((_, index) => {
                            const pageNumber = index + 1;
                            if (
                              pageNumber === 1 ||
                              pageNumber === totalPagesSubmissions ||
                              (pageNumber >= currentPageSubmissions - 1 && pageNumber <= currentPageSubmissions + 1)
                            ) {
                              return (
                                <button
                                  key={pageNumber}
                                  onClick={() => paginateSubmissions(pageNumber)}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentPageSubmissions === pageNumber
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                                    : 'border border-amber-300 bg-white hover:bg-amber-50 text-amber-700'
                                    }`}
                                >
                                  {pageNumber}
                                </button>
                              );
                            } else if (
                              pageNumber === currentPageSubmissions - 2 ||
                              pageNumber === currentPageSubmissions + 2
                            ) {
                              return (
                                <span key={pageNumber} className="px-2 py-2 text-amber-400">
                                  ...
                                </span>
                              );
                            }
                            return null;
                          })}
                        </div>
                        <button
                          onClick={nextPageSubmissions}
                          disabled={currentPageSubmissions === totalPagesSubmissions}
                          className="px-3 py-2 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Assignment Modal */}
      {showViewModal && safeSelectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-amber-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
                Assignment Details
              </h2>
              <button
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Assignment Title</label>
                  <h3 className="text-2xl font-bold text-gray-800 mt-1">{safeSelectedItem.title}</h3>
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Description</label>
                  <p className="text-gray-700 mt-1 leading-relaxed">{safeSelectedItem.description || 'No description provided'}</p>
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Instructions</label>
                  <p className="text-gray-700 mt-1 leading-relaxed bg-amber-50 p-4 rounded-lg">
                    {safeSelectedItem.instructions || 'No specific instructions provided'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                      <FaCalendarAlt /> Due Date
                    </label>
                    <p className="text-gray-800 font-semibold mt-1">
                      {safeSelectedItem.due_date ? new Date(String(safeSelectedItem.due_date)).toLocaleDateString() : 'No due date set'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Max Points</label>
                    <p className="text-gray-800 font-semibold mt-1">{safeSelectedItem.max_points || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                    <FaBook /> Course
                  </label>
                  <div className="mt-2">
                    <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full font-semibold">
                      {safeSelectedItem.course_title || safeSelectedItem.course_name || 'Unknown Course'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                    <FaUser /> Instructor
                  </label>
                  <p className="text-gray-800 font-semibold mt-1">{safeSelectedItem.instructor_name || 'Unknown Instructor'}</p>
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Submissions</label>
                  <p className="text-blue-600 font-bold text-2xl mt-1">{safeSelectedItem.submission_count || 0}</p>
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Status</label>
                  <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold mt-1 ${String(safeSelectedItem.status) === 'active' ? 'bg-orange-100 text-orange-800' :
                    String(safeSelectedItem.status) === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {String(safeSelectedItem.status || 'Draft')}
                  </span>
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Visibility</label>
                  <p className="text-gray-800 mt-1 capitalize">{safeSelectedItem.visibility || 'draft'}</p>
                </div>

                {safeSelectedItem.estimated_time && (
                  <div>
                    <label className="text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                      <FaClock /> Estimated Time
                    </label>
                    <p className="text-gray-800 mt-1">{safeSelectedItem.estimated_time} hours</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={() => {
                  closeModals();
                  handleEditAssignment(selectedItem);
                }}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
              >
                <FaEdit /> Edit Assignment
              </button>
              <button
                onClick={closeModals}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-amber-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
                Edit Assignment
              </h2>
              <button
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Assignment Title</label>
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                    placeholder="Enter assignment title"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Description</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows="4"
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                    placeholder="Enter assignment description"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Instructions</label>
                  <textarea
                    value={editForm.instructions || ''}
                    onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                    placeholder="Enter detailed instructions"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Due Date</label>
                  <input
                    type="datetime-local"
                    value={editForm.due_date || ''}
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Max Points</label>
                  <input
                    type="number"
                    value={editForm.max_points || ''}
                    onChange={(e) => setEditForm({ ...editForm, max_points: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                    placeholder="Enter maximum points"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Course ID</label>
                  <input
                    type="text"
                    value={editForm.course_id || ''}
                    onChange={(e) => setEditForm({ ...editForm, course_id: e.target.value })}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                    placeholder="Enter course ID"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Visibility</label>
                  <select
                    value={editForm.visibility || 'draft'}
                    onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value })}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={closeModals}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={actionLoading.type === 'save'}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading.type === 'save' ? (
                  <>
                    <FaSpinner className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <FaSave /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-amber-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
                Create New Assignment
              </h2>
              <button
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Assignment Title *</label>
                  <input
                    type="text"
                    value={editForm.title || ''}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                    placeholder="Enter assignment title"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Description</label>
                  <textarea
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows="4"
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                    placeholder="Enter assignment description"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Instructions</label>
                  <textarea
                    value={editForm.instructions || ''}
                    onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                    placeholder="Enter detailed instructions for students"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Assignment Type</label>
                  <select
                    value={editForm.type || 'exercise'}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                  >
                    <option value="exercise">Exercise</option>
                    <option value="project">Project</option>
                    <option value="quiz">Quiz</option>
                    <option value="homework">Homework</option>
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Course ID *</label>
                  <input
                    type="text"
                    value={editForm.course_id || ''}
                    onChange={(e) => setEditForm({ ...editForm, course_id: e.target.value })}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                    placeholder="e.g. JAVA001, PYTHON101"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Due Date *</label>
                  <input
                    type="datetime-local"
                    value={editForm.due_date || ''}
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Max Points *</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.max_points || 100}
                    onChange={(e) => setEditForm({ ...editForm, max_points: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                    placeholder="Enter maximum points"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Estimated Time (hours)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={editForm.estimated_time || 1}
                    onChange={(e) => setEditForm({ ...editForm, estimated_time: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                    placeholder="Estimated completion time"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Visibility</label>
                  <select
                    value={editForm.visibility || 'draft'}
                    onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value })}
                    className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={closeModals}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCreate}
                disabled={actionLoading.type === 'create' || !editForm.title || !editForm.course_id || !editForm.due_date}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading.type === 'create' ? (
                  <>
                    <FaSpinner className="animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <FaPlus /> Create Assignment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Submission Modal */}
      {showSubmissionModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-amber-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
                Submission Details
              </h2>
              <button
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                    <FaUser /> Student Information
                  </label>
                  <div className="mt-2 p-4 bg-amber-50 rounded-lg">
                    <h3 className="text-xl font-bold text-gray-800">{safeSelectedItem.student_name}</h3>
                    <p className="text-gray-600">{safeSelectedItem.student_email}</p>
                    <p className="text-sm text-gray-500 mt-1">Student ID: {safeSelectedItem.student_id}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                    <FaBook /> Assignment
                  </label>
                  <div className="mt-2">
                    <h3 className="text-lg font-bold text-gray-800">{safeSelectedItem.assignment_title}</h3>
                    <p className="text-sm text-gray-500">Assignment ID: {safeSelectedItem.assignment_id}</p>
                    {safeSelectedItem.course_title && (
                      <span className="inline-block mt-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                        {safeSelectedItem.course_title}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                    <FaCalendarAlt /> Submission Date
                  </label>
                  <p className="text-gray-800 font-semibold mt-2">
                    {safeSelectedItem.submitted_at ? (
                      new Date(String(safeSelectedItem.submitted_at)).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZoneName: 'short'
                      })
                    ) : (
                      'Not submitted yet'
                    )}
                  </p>
                </div>

                {safeSelectedItem.file_path && (
                  <div>
                    <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Submitted File</label>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-800 font-mono text-sm">{safeSelectedItem.file_path}</p>
                      <button
                        onClick={() => handleDownloadSubmission(selectedItem)}
                        className="mt-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                      >
                        <FaDownload /> Download File
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Status</label>
                  <div className="mt-2">
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${String(safeSelectedItem.status) === 'submitted' ? 'bg-orange-100 text-orange-800' :
                      String(safeSelectedItem.status) === 'graded' ? 'bg-blue-100 text-blue-800' :
                        String(safeSelectedItem.status) === 'late' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                      }`}>
                      {String(safeSelectedItem.status || 'Pending')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Grade</label>
                  <p className="text-2xl font-bold text-orange-600 mt-2">
                    {safeSelectedItem.grade ? `${safeSelectedItem.grade}` : 'Not graded yet'}
                  </p>
                </div>

                {safeSelectedItem.feedback && (
                  <div>
                    <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Instructor Feedback</label>
                    <div className="mt-2 p-4 bg-blue-50 rounded-lg">
                      <p className="text-gray-800 leading-relaxed">{safeSelectedItem.feedback}</p>
                    </div>
                  </div>
                )}

                {safeSelectedItem.comments && (
                  <div>
                    <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Student Comments</label>
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-800 leading-relaxed">{safeSelectedItem.comments}</p>
                    </div>
                  </div>
                )}

                <div className="bg-amber-50 p-4 rounded-lg">
                  <h4 className="font-bold text-amber-800 mb-2">Quick Actions</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleDownloadSubmission(selectedItem)}
                      className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <FaDownload /> Download Submission
                    </button>
                    <button
                      onClick={() => handleGradeSubmission(selectedItem)}
                      className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <FaEdit /> Grade Submission
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={closeModals}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Submission Modal */}
      {showGradeModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-amber-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
                Grade Submission
              </h2>
              <button
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
              >
                <FaTimes size={24} />
              </button>
            </div>

            {/* Student & Assignment Info */}
            <div className="mb-6 p-4 bg-amber-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Student</label>
                  <p className="text-lg font-semibold text-gray-800">{safeSelectedItem.student_name}</p>
                  <p className="text-sm text-gray-600">{safeSelectedItem.student_email}</p>
                </div>
                <div>
                  <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Assignment</label>
                  <p className="text-lg font-semibold text-gray-800">{safeSelectedItem.assignment_title}</p>
                  <p className="text-sm text-gray-600">
                    Submitted: {safeSelectedItem.submitted_at ? (
                      new Date(String(safeSelectedItem.submitted_at)).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    ) : 'Not submitted'}
                  </p>
                </div>
              </div>
            </div>

            {/* Grading Form */}
            <div className="space-y-6">
              <div>
                <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Grade *</label>
                <div className="mt-2 flex items-center gap-4">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={gradeForm.grade || ''}
                    onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                    className="w-32 px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center font-bold text-xl"
                    placeholder="0-100"
                  />
                  <span className="text-lg font-semibold text-gray-600">/ 100</span>
                  <div className="flex-1">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setGradeForm({ ...gradeForm, grade: '100' })}
                        className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold hover:bg-orange-200"
                      >
                        A (100)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGradeForm({ ...gradeForm, grade: '85' })}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold hover:bg-blue-200"
                      >
                        B (85)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGradeForm({ ...gradeForm, grade: '70' })}
                        className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold hover:bg-yellow-200"
                      >
                        C (70)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGradeForm({ ...gradeForm, grade: '0' })}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold hover:bg-red-200"
                      >
                        F (0)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Feedback</label>
                <textarea
                  value={gradeForm.feedback || ''}
                  onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                  rows="6"
                  className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                  placeholder="Provide detailed feedback for the student..."
                />
              </div>

              <div>
                <label className="text-sm font-bold text-amber-700 uppercase tracking-wider">Status</label>
                <select
                  value={gradeForm.status || 'graded'}
                  onChange={(e) => setGradeForm({ ...gradeForm, status: e.target.value })}
                  className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent mt-2"
                >
                  <option value="graded">Graded</option>
                  <option value="needs_revision">Needs Revision</option>
                  <option value="excellent">Excellent</option>
                  <option value="satisfactory">Satisfactory</option>
                  <option value="unsatisfactory">Unsatisfactory</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={closeModals}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGrade}
                disabled={actionLoading.type === 'grade' || !gradeForm.grade}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading.type === 'grade' ? (
                  <>
                    <FaSpinner className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <FaSave /> Save Grade
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsAndSubmissions;
