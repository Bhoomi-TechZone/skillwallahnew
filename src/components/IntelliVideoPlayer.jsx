import React, { useState, useEffect, useRef } from 'react';
import {
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  Cog6ToothIcon,
  ListBulletIcon,
  ClockIcon,
  AcademicCapIcon,
  DocumentIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import '../styles/IntelliVideoPlayer.css';

const IntelliVideoPlayer = ({ isOpen, onClose, courseId, courseName, initialLessonId = null }) => {
  const [modules, setModules] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [progress, setProgress] = useState({});
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen && courseId) {
      fetchCourseData();
    }
  }, [isOpen, courseId]);

  useEffect(() => {
    if (initialLessonId && allLessons.length > 0) {
      const lesson = allLessons.find(l => l.id === initialLessonId);
      if (lesson) {
        setCurrentLesson(lesson);
      }
    } else if (allLessons.length > 0 && !currentLesson) {
      // Set first lesson with video as default, fallback to first lesson with content
      const firstVideoLesson = allLessons.find(l => l.video_url);
      const firstContentLesson = allLessons.find(l => l.video_url || l.pdf_url);
      if (firstVideoLesson) {
        setCurrentLesson(firstVideoLesson);
      } else if (firstContentLesson) {
        setCurrentLesson(firstContentLesson);
      }
    }
  }, [initialLessonId, allLessons, currentLesson]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, duration, togglePlayPause, toggleMute, toggleFullscreen]);

  const fetchCourseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');

      // Fetch modules
      const modulesResponse = await fetch(`http://localhost:4000/courses/${courseId}/modules`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (modulesResponse.ok) {
        const modulesData = await modulesResponse.json();
        setModules(modulesData);

        // Fetch lessons for each module
        const allLessonsData = [];
        for (const module of modulesData) {
          try {
            const lessonsResponse = await fetch(`http://localhost:4000/modules/${module.id}/lessons`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (lessonsResponse.ok) {
              const lessonsData = await lessonsResponse.json();
              const lessonsWithModule = lessonsData.map(lesson => ({
                ...lesson,
                module_id: module.id,
                module_title: module.title,
                module_order: module.order
              }));
              allLessonsData.push(...lessonsWithModule);
            }
          } catch (err) {
            console.error(`Failed to fetch lessons for module ${module.id}:`, err);
          }
        }

        // Sort lessons by module order and lesson order
        allLessonsData.sort((a, b) => {
          if (a.module_order !== b.module_order) {
            return a.module_order - b.module_order;
          }
          return a.order - b.order;
        });

        setAllLessons(allLessonsData);
      } else {
        throw new Error('Failed to fetch course data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoLoad = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      // Load saved progress
      const savedProgress = localStorage.getItem(`video_progress_${currentLesson?.id}`);
      if (savedProgress) {
        const { currentTime: savedTime } = JSON.parse(savedProgress);
        videoRef.current.currentTime = savedTime;
        setCurrentTime(savedTime);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && currentLesson) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);

      // Save progress every 5 seconds
      if (Math.floor(time) % 5 === 0) {
        const progressData = {
          currentTime: time,
          duration: duration,
          percentage: duration > 0 ? (time / duration) * 100 : 0,
          lastWatched: new Date().toISOString()
        };
        localStorage.setItem(`video_progress_${currentLesson.id}`, JSON.stringify(progressData));
        setProgress(prev => ({
          ...prev,
          [currentLesson.id]: progressData
        }));
      }
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const changePlaybackSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const navigateLesson = (direction) => {
    const currentIndex = allLessons.findIndex(l => l.id === currentLesson?.id);
    let newIndex = currentIndex;

    if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < allLessons.length - 1) {
      newIndex = currentIndex + 1;
    }

    const newLesson = allLessons[newIndex];
    if (newLesson && (newLesson.video_url || newLesson.pdf_url)) {
      setCurrentLesson(newLesson);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  const selectLesson = (lesson) => {
    if (lesson.video_url || lesson.pdf_url) {
      setCurrentLesson(lesson);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const currentIndex = allLessons.findIndex(l => l.id === currentLesson?.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allLessons.length - 1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black" ref={playerRef}>
      {/* Header */}
      <div className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-6 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <div className="text-white">
              <h1 className="text-xl font-bold">{courseName}</h1>
              {currentLesson && (
                <p className="text-sm opacity-90">
                  Module {currentLesson.module_order}: {currentLesson.module_title} • {currentLesson.title}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowPlaylist(!showPlaylist)}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          >
            <ListBulletIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-full">
        {/* Video Player */}
        <div
          className={`relative ${showPlaylist ? 'flex-1' : 'w-full'} bg-black flex items-center justify-center`}
          onMouseMove={handleMouseMove}
        >
          {loading ? (
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
              <p>Loading course content...</p>
            </div>
          ) : error ? (
            <div className="text-center text-white">
              <AcademicCapIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-red-400">{error}</p>
            </div>
          ) : currentLesson?.video_url ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                src={currentLesson.video_url?.startsWith('http')
                  ? currentLesson.video_url
                  : currentLesson.video_url?.startsWith('/upload/')
                    ? `http://localhost:4000${currentLesson.video_url}`
                    : currentLesson.video_url
                      ? `http://localhost:4000/uploads/${currentLesson.video_url}`
                      : undefined
                }
                onLoadedMetadata={handleVideoLoad}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  setIsPlaying(false);
                  if (hasNext) navigateLesson('next');
                }}
                onClick={togglePlayPause}
              />

              {/* Play/Pause Overlay */}
              {!isPlaying && showControls && (
                <button
                  onClick={togglePlayPause}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                >
                  <div className="bg-white/90 rounded-full p-4 hover:bg-white transition-colors">
                    <PlayIcon className="w-12 h-12 text-black ml-1" />
                  </div>
                </button>
              )}

              {/* Video Controls */}
              <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                {/* Progress Bar */}
                <div
                  className="w-full h-2 bg-white/30 rounded-full cursor-pointer mb-4 group progress-bar"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-150 group-hover:bg-blue-400 progress-fill"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  ></div>
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-4">
                    {/* Play/Pause */}
                    <button onClick={togglePlayPause} className="p-2 hover:bg-white/20 rounded-full">
                      {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                    </button>

                    {/* Previous/Next */}
                    <button
                      onClick={() => navigateLesson('prev')}
                      disabled={!hasPrevious}
                      className="p-2 hover:bg-white/20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => navigateLesson('next')}
                      disabled={!hasNext}
                      className="p-2 hover:bg-white/20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRightIcon className="w-6 h-6" />
                    </button>

                    {/* Volume */}
                    <div className="flex items-center space-x-2">
                      <button onClick={toggleMute} className="p-2 hover:bg-white/20 rounded-full">
                        {isMuted || volume === 0 ? <SpeakerXMarkIcon className="w-6 h-6" /> : <SpeakerWaveIcon className="w-6 h-6" />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-white/30 rounded-full appearance-none slider"
                      />
                    </div>

                    {/* Time */}
                    <span className="text-sm">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <button
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="p-2 hover:bg-white/20 rounded-full text-sm"
                      >
                        {playbackSpeed}x
                      </button>
                      {showSpeedMenu && (
                        <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg p-2 min-w-[80px]">
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                            <button
                              key={speed}
                              onClick={() => changePlaybackSpeed(speed)}
                              className={`block w-full text-left px-3 py-2 text-sm rounded hover:bg-white/20 ${playbackSpeed === speed ? 'bg-blue-500' : ''
                                }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Keyboard Shortcuts */}
                    <button
                      onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                      className="p-2 hover:bg-white/20 rounded-full relative"
                      title="Keyboard shortcuts"
                    >
                      <Cog6ToothIcon className="w-6 h-6" />
                      {showKeyboardShortcuts && (
                        <div className="absolute bottom-full right-0 mb-2 bg-black/95 rounded-lg p-4 min-w-[280px] text-sm">
                          <h4 className="font-semibold mb-3">Keyboard Shortcuts</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Play/Pause</span>
                              <span className="bg-gray-700 px-2 py-1 rounded text-xs">Space</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Seek backward</span>
                              <span className="bg-gray-700 px-2 py-1 rounded text-xs">←</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Seek forward</span>
                              <span className="bg-gray-700 px-2 py-1 rounded text-xs">→</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Volume up</span>
                              <span className="bg-gray-700 px-2 py-1 rounded text-xs">↑</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Volume down</span>
                              <span className="bg-gray-700 px-2 py-1 rounded text-xs">↓</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Mute/Unmute</span>
                              <span className="bg-gray-700 px-2 py-1 rounded text-xs">M</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Fullscreen</span>
                              <span className="bg-gray-700 px-2 py-1 rounded text-xs">F</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </button>

                    {/* Fullscreen */}
                    <button onClick={toggleFullscreen} className="p-2 hover:bg-white/20 rounded-full">
                      {isFullscreen ? <ArrowsPointingInIcon className="w-6 h-6" /> : <ArrowsPointingOutIcon className="w-6 h-6" />}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : currentLesson?.pdf_url ? (
            <div className="text-center text-white">
              <DocumentIcon className="w-16 h-16 mx-auto mb-4 text-blue-400" />
              <h3 className="text-xl font-semibold mb-2">PDF Material Available</h3>
              <p className="opacity-70 mb-4">This lesson contains a PDF document</p>
              <a
                href={currentLesson.pdf_url?.startsWith('http')
                  ? currentLesson.pdf_url
                  : currentLesson.pdf_url?.startsWith('/upload/')
                    ? `http://localhost:4000${currentLesson.pdf_url}`
                    : currentLesson.pdf_url
                      ? `http://localhost:4000/uploads/${currentLesson.pdf_url}`
                      : '#'
                }
                download={currentLesson.pdf_filename || `${currentLesson.title}.pdf`}
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span>Download PDF</span>
              </a>
            </div>
          ) : (
            <div className="text-center text-white">
              <AcademicCapIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Content Available</h3>
              <p className="opacity-70">Select a lesson with video or PDF content from the playlist</p>
            </div>
          )}
        </div>

        {/* Playlist Sidebar */}
        {showPlaylist && (
          <div className="w-96 bg-gray-900 text-white overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Course Content</h3>
              <div className="space-y-4">
                {modules.map(module => {
                  const moduleLessons = allLessons.filter(l => l.module_id === module.id);
                  if (moduleLessons.length === 0) return null;

                  return (
                    <div key={module.id} className="space-y-2">
                      <h4 className="font-medium text-gray-300 border-b border-gray-700 pb-2 module-header p-2 rounded">
                        Module {module.order}: {module.title}
                      </h4>
                      <div className="space-y-1">
                        {moduleLessons.map((lesson, index) => {
                          const isActive = currentLesson?.id === lesson.id;
                          const hasVideo = lesson.video_url;
                          const hasPdf = lesson.pdf_url;
                          const hasContent = hasVideo || hasPdf;
                          const lessonProgress = progress[lesson.id];
                          const isCompleted = lessonProgress && lessonProgress.percentage > 90;

                          return (
                            <button
                              key={lesson.id}
                              onClick={() => hasContent && setCurrentLesson(lesson)}
                              disabled={!hasContent}
                              className={`w-full text-left p-3 rounded-lg transition-colors lesson-item ${isActive
                                ? 'active bg-blue-600 text-white'
                                : hasContent
                                  ? 'hover:bg-gray-800 text-gray-100'
                                  : 'text-gray-500 cursor-not-allowed'
                                } ${isCompleted ? 'completed' : ''}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium">{lesson.order}</span>
                                    <span className="text-sm">{lesson.title}</span>
                                    {hasVideo && (
                                      <PlayIcon className="w-4 h-4 text-orange-400" />
                                    )}
                                    {lesson.pdf_url && (
                                      <DocumentIcon className="w-4 h-4 text-blue-400" />
                                    )}
                                    {isCompleted && (
                                      <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <div className="flex items-center space-x-2">
                                      <ClockIcon className="w-3 h-3 text-gray-400" />
                                      <span className="text-xs text-gray-400">{lesson.duration}</span>
                                    </div>
                                    {lesson.pdf_url && (
                                      <a
                                        href={lesson.pdf_url?.startsWith('http')
                                          ? lesson.pdf_url
                                          : lesson.pdf_url?.startsWith('/upload/')
                                            ? `http://localhost:4000${lesson.pdf_url}`
                                            : lesson.pdf_url
                                              ? `http://localhost:4000/uploads/${lesson.pdf_url}`
                                              : '#'
                                        }
                                        download={lesson.pdf_filename || `${lesson.title}.pdf`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                        title="Download PDF"
                                      >
                                        <ArrowDownTrayIcon className="w-3 h-3" />
                                        <span>PDF</span>
                                      </a>
                                    )}
                                  </div>
                                  {lessonProgress && (
                                    <div className="mt-2">
                                      <div className="w-full h-1 bg-gray-700 rounded-full">
                                        <div
                                          className="h-1 bg-blue-500 rounded-full transition-all duration-300"
                                          style={{ width: `${lessonProgress.percentage}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelliVideoPlayer;