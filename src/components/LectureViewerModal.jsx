import {
  AcademicCapIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FolderOpenIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  TrashIcon,
  VideoCameraIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import IntelliVideoPlayer from './IntelliVideoPlayer';

const LectureViewerModal = ({ isOpen, onClose, courseId, courseName }) => {
  const [lectures, setLectures] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedModule, setSelectedModule] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [playingVideo, setPlayingVideo] = useState(null);
  const [videoProgress, setVideoProgress] = useState({});
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [selectedLectureId, setSelectedLectureId] = useState(null);

  useEffect(() => {
    if (isOpen && courseId) {
      fetchLectures();
      fetchModules();
    }
  }, [isOpen, courseId]);

  const fetchLectures = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/lectures/course/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLectures(data.lectures || []);
      } else {
        throw new Error('Failed to fetch lectures');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/courses/${courseId}/modules`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setModules(data);
      }
    } catch (err) {
      console.error('Failed to fetch modules:', err);
    }
  };

  const handleDeleteLecture = async (lectureId, lectureTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${lectureTitle}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/lectures/${lectureId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchLectures(); // Refresh the list
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete lecture');
      }
    } catch (err) {
      alert(`Error deleting lecture: ${err.message}`);
    }
  };

  const handleVideoPlay = (lectureId) => {
    setPlayingVideo(lectureId);
  };

  const handlePlayInFullPlayer = (lectureId) => {
    setSelectedLectureId(lectureId);
    setShowVideoPlayer(true);
  };

  const handleVideoProgress = (lectureId, currentTime, duration) => {
    setVideoProgress(prev => ({
      ...prev,
      [lectureId]: {
        currentTime,
        duration,
        percentage: duration > 0 ? (currentTime / duration) * 100 : 0
      }
    }));
  };

  // Filter lectures based on module selection and search term
  const filteredLectures = lectures.filter(lecture => {
    const matchesModule = selectedModule === 'all' || lecture.module_id === selectedModule;
    const matchesSearch = lecture.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lecture.description && lecture.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesModule && matchesSearch;
  });

  // Group lectures by module
  const lecturesByModule = filteredLectures.reduce((acc, lecture) => {
    const moduleId = lecture.module_id;
    if (!acc[moduleId]) {
      acc[moduleId] = [];
    }
    acc[moduleId].push(lecture);
    return acc;
  }, {});

  const getModuleName = (moduleId) => {
    const module = modules.find(m => (m._id || m.id) === moduleId);
    return module ? `Module ${module.order}: ${module.title}` : 'Unknown Module';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Course Lectures</h2>
              <p className="text-sm opacity-90">{courseName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search lectures..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
              >
                <option value="all">All Modules</option>
                {modules.map((module) => (
                  <option key={module._id || module.id} value={module._id || module.id}>
                    Module {module.order}: {module.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading lectures...</p>
            </div>
          ) : filteredLectures.length === 0 ? (
            <div className="text-center py-8">
              <AcademicCapIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No lectures found</h3>
              <p className="text-gray-600">
                {searchTerm || selectedModule !== 'all'
                  ? "Try adjusting your search or filter criteria."
                  : "No lectures have been uploaded for this course yet."}
              </p>
            </div>
          ) : (
            /* Lectures by Module */
            <div className="space-y-6">
              {Object.entries(lecturesByModule).map(([moduleId, modulelectures]) => (
                <div key={moduleId} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <FolderOpenIcon className="w-6 h-6 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getModuleName(moduleId)}
                    </h3>
                    <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm">
                      {modulelectures.length} lecture{modulelectures.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {modulelectures.map((lecture) => (
                      <div key={lecture.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{lecture.title}</h4>
                            {lecture.description && (
                              <p className="text-sm text-gray-600 mb-2">{lecture.description}</p>
                            )}
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <div className="flex items-center space-x-1">
                                <CalendarIcon className="w-4 h-4" />
                                <span>{formatDate(lecture.uploaded_at)}</span>
                              </div>
                              {videoProgress[lecture.id] && (
                                <div className="flex items-center space-x-1">
                                  <ClockIcon className="w-4 h-4" />
                                  <span>
                                    {formatDuration(videoProgress[lecture.id].currentTime)} /
                                    {formatDuration(videoProgress[lecture.id].duration)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDeleteLecture(lecture.id, lecture.title)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete lecture"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Video Player */}
                        {lecture.video_file ? (
                          <div className="relative">
                            <div className="relative group cursor-pointer" onClick={() => handlePlayInFullPlayer(lecture.id)}>
                              <video
                                className="w-full h-32 object-cover rounded-lg bg-gray-100"
                                poster="/api/placeholder/400/200"
                              >
                                <source src={`http://localhost:4000${lecture.video_file}`} type="video/mp4" />
                                Your browser does not support the video tag.
                              </video>

                              {/* Play Button Overlay */}
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-lg">
                                <div className="bg-white/90 rounded-full p-3 shadow-lg">
                                  <PlayIcon className="w-8 h-8 text-gray-800" />
                                </div>
                              </div>

                              {/* Duration Badge */}
                              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                {formatDuration(videoProgress[lecture.id]?.duration)}
                              </div>
                            </div>

                            {/* Progress Bar */}
                            {videoProgress[lecture.id] && (
                              <div className="mt-2 bg-gray-200 rounded-full h-1">
                                <div
                                  className="bg-purple-600 rounded-full h-1 transition-all duration-300"
                                  style={{ width: `${videoProgress[lecture.id].percentage}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                              <VideoCameraIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">No video uploaded</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Total: {filteredLectures.length} lecture{filteredLectures.length !== 1 ? 's' : ''}
              {selectedModule !== 'all' && (
                <span> in {getModuleName(selectedModule)}</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Intellipath Video Player */}
      {showVideoPlayer && (
        <IntelliVideoPlayer
          isOpen={showVideoPlayer}
          onClose={() => setShowVideoPlayer(false)}
          courseId={courseId}
          courseName={courseName}
          initialLessonId={selectedLectureId}
        />
      )}
    </div>
  );
};

export default LectureViewerModal;