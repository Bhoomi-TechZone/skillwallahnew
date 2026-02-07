import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  VideoCameraIcon,
  DocumentIcon,
  PlayIcon,
  ClockIcon,
  ListBulletIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import IntelliVideoPlayer from './IntelliVideoPlayer';

// Throttle utility for reducing rapid updates
const throttle = (func, limit) => {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
};

const LessonManager = ({ moduleId, moduleName, isOpen, onClose, onLessonsUpdated }) => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [uploadingLesson, setUploadingLesson] = useState(null);
  const [uploadType, setUploadType] = useState('video'); // 'video' or 'pdf'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [courseId, setCourseId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);

  const videoInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  // Throttled progress updater to prevent flickering
  const throttledProgressUpdate = useCallback(
    throttle((progress) => {
      setUploadProgress(progress);
    }, 50), // Update every 50ms max
    []
  );

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: '',
    order: 1
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && moduleId) {
      fetchLessons();
      fetchCourseId();
    }
  }, [isOpen, moduleId]);

  const fetchCourseId = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/modules/${moduleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const moduleData = await response.json();
        setCourseId(moduleData.course_id);
      }
    } catch (err) {
      console.error('Failed to fetch course ID:', err);
    }
  };

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/modules/${moduleId}/lessons`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLessons(data);
      } else {
        throw new Error('Failed to fetch lessons');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLesson = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a lesson title');
      return;
    }

    if (!formData.duration.trim()) {
      alert('Please enter lesson duration');
      return;
    }

    // Validate duration format
    const durationRegex = /^\d{2}:\d{2}$/;
    if (!durationRegex.test(formData.duration)) {
      alert('Duration must be in MM:SS format (e.g., 17:30)');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/modules/${moduleId}/lessons`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchLessons();
        setShowCreateModal(false);
        resetForm();
        onLessonsUpdated?.();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create lesson');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateLesson = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a lesson title');
      return;
    }

    if (!formData.duration.trim()) {
      alert('Please enter lesson duration');
      return;
    }

    // Validate duration format
    const durationRegex = /^\d{2}:\d{2}$/;
    if (!durationRegex.test(formData.duration)) {
      alert('Duration must be in MM:SS format (e.g., 17:30)');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/modules/lessons/${editingLesson.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchLessons();
        setShowCreateModal(false);
        setEditingLesson(null);
        resetForm();
        onLessonsUpdated?.();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update lesson');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLesson = async (lesson) => {
    if (!window.confirm(`Are you sure you want to delete "${lesson.title}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/modules/lessons/${lesson.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchLessons();
        onLessonsUpdated?.();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete lesson');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFileUpload = async (lessonId, file, type) => {
    setIsUploading(true);
    setUploadProgress(0);

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);

    // Determine endpoint based on type
    const endpoint = type === 'video' ?
      `http://localhost:4000/upload/lesson-video/${lessonId}` :
      `http://localhost:4000/upload/lesson-pdf/${lessonId}`;

    try {
      const token = localStorage.getItem('token');

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            // Use throttled updates for smoother progress
            throttledProgressUpdate(progress);
          }
        });

        xhr.addEventListener('load', async () => {
          if (xhr.status === 200) {
            const result = JSON.parse(xhr.responseText);

            // Update lesson with the new file URL
            const updateData = type === 'video' ?
              { video_url: result.video_url } :
              { pdf_url: result.pdf_url };

            await fetch(`http://localhost:4000/modules/lessons/${lessonId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(updateData)
            });

            await fetchLessons();
            onLessonsUpdated?.();
            resolve(result);
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', endpoint);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });
    } catch (err) {
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadingLesson(null);
    }
  };

  const handleVideoUpload = async (lesson, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid video file (MP4, AVI, MOV, WMV, WebM)');
      return;
    }

    // Validate file size (500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Video file is too large. Maximum size is 500MB.');
      return;
    }

    setUploadingLesson(lesson);
    setUploadType('video');

    try {
      await handleFileUpload(lesson.id, file, 'video');
      alert('Video uploaded successfully!');
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    }

    // Reset file input
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handlePdfUpload = async (lesson, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      alert('Please select a valid PDF file');
      return;
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('PDF file is too large. Maximum size is 50MB.');
      return;
    }

    setUploadingLesson(lesson);
    setUploadType('pdf');

    try {
      await handleFileUpload(lesson.id, file, 'pdf');
      alert('PDF uploaded successfully!');
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    }

    // Reset file input
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
  };

  const handlePlayVideo = (lesson) => {
    setSelectedLessonId(lesson.id);
    setShowVideoPlayer(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      duration: '',
      order: lessons.length + 1
    });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingLesson(null);
    setShowCreateModal(true);
  };

  const openEditModal = (lesson) => {
    setFormData({
      title: lesson.title,
      description: lesson.description || '',
      duration: lesson.duration,
      order: lesson.order
    });
    setEditingLesson(lesson);
    setShowCreateModal(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden upload-modal animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Lesson Management</h2>
              <p className="text-sm opacity-90">Module: {moduleName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Add Lesson Button */}
          <div className="mb-6">
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Add Lesson</span>
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && uploadingLesson && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <CloudArrowUpIcon className="w-6 h-6 text-blue-600" />
                <div className="flex-1">
                  <p className="text-blue-800 font-medium">
                    Uploading {uploadType} for "{uploadingLesson.title}"...
                  </p>
                  <div className="mt-2 bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-[#988913] rounded-full h-2 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">{uploadProgress}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading lessons...</p>
            </div>
          ) : (
            /* Lessons List */
            <div className="space-y-4">
              {lessons.length === 0 ? (
                <div className="text-center py-8">
                  <VideoCameraIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No lessons yet</h3>
                  <p className="text-gray-600 mb-4">Start by creating your first lesson for this module.</p>
                  <button
                    onClick={openCreateModal}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg"
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Create First Lesson
                  </button>
                </div>
              ) : (
                lessons.map((lesson, index) => (
                  <div key={lesson.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">{lesson.order}</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{lesson.title}</h4>
                          {lesson.description && (
                            <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <ClockIcon className="w-4 h-4" />
                              <span>{lesson.duration}</span>
                            </div>
                            {lesson.video_url && (
                              <div className="flex items-center space-x-1 text-sm text-orange-600">
                                <VideoCameraIcon className="w-4 h-4" />
                                <span>Video available</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        {/* Play Video Button */}
                        {lesson.video_url && (
                          <button
                            onClick={() => handlePlayVideo(lesson)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Play video"
                          >
                            <PlayIcon className="w-5 h-5" />
                          </button>
                        )}

                        {/* Video Upload */}
                        <label className="cursor-pointer">
                          <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/*"
                            onChange={(e) => handleVideoUpload(lesson, e)}
                            className="hidden"
                            disabled={isUploading}
                          />
                          <div className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Upload video">
                            <VideoCameraIcon className="w-5 h-5" />
                          </div>
                        </label>

                        {/* PDF Upload */}
                        <label className="cursor-pointer">
                          <input
                            ref={pdfInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={(e) => handlePdfUpload(lesson, e)}
                            className="hidden"
                            disabled={isUploading}
                          />
                          <div className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Upload PDF">
                            <DocumentIcon className="w-5 h-5" />
                          </div>
                        </label>

                        {/* Edit */}
                        <button
                          onClick={() => openEditModal(lesson)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          disabled={isUploading}
                          title="Edit lesson"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteLesson(lesson)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={isUploading}
                          title="Delete lesson"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Lesson Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingLesson ? 'Edit Lesson' : 'Create New Lesson'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="e.g., Lecture 1 - Cloud Computing Intro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="Brief description of this lesson"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration * (MM:SS format)
                  </label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="17:30"
                    pattern="[0-9]{2}:[0-9]{2}"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: MM:SS (e.g., 17:30 for 17 minutes 30 seconds)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lesson Order *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingLesson(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={editingLesson ? handleUpdateLesson : handleCreateLesson}
                  disabled={submitting}
                  className="px-6 py-2 bg-gradient-to-r from-[#988913] to-[#7d7310] text-white rounded-lg hover:from-[#7d7310] hover:to-[#988913] transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-[#988913]/25 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (editingLesson ? 'Update Lesson' : 'Create Lesson')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Intellipath Video Player */}
      {showVideoPlayer && courseId && (
        <IntelliVideoPlayer
          isOpen={showVideoPlayer}
          onClose={() => setShowVideoPlayer(false)}
          courseId={courseId}
          courseName={moduleName}
          initialLessonId={selectedLessonId}
        />
      )}
    </div>
  );
};

export default LessonManager;