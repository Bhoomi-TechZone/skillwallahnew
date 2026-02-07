import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentIcon,
  DocumentTextIcon,
  LockClosedIcon,
  PencilSquareIcon,
  PlayIcon,
  QuestionMarkCircleIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const CourseContentViewer = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState({});
  const [selectedContent, setSelectedContent] = useState(null);
  const [completedItems, setCompletedItems] = useState(new Set());
  const [completedModules, setCompletedModules] = useState(new Set());
  const [showLockTooltip, setShowLockTooltip] = useState(null);
  const [videoProgress, setVideoProgress] = useState({});
  const [watchedVideos, setWatchedVideos] = useState(new Set());
  const [showVideoTooltip, setShowVideoTooltip] = useState(false);
  const [userProgress, setUserProgress] = useState({});
  const [progressStats, setProgressStats] = useState({});
  const [lastUpdateTime, setLastUpdateTime] = useState({});  // Track last update per video
  const [watchedSegments, setWatchedSegments] = useState({});  // Track watched video segments
  const [syncStatus, setSyncStatus] = useState('synced');  // synced, syncing, error
  const [currentPlaybackRate, setCurrentPlaybackRate] = useState(1.0);
  const [activeTab, setActiveTab] = useState('content'); // 'content' or 'quizzes'

  // Fetch course data
  useEffect(() => {
    fetchCourseData();
    fetchUserProgress();

    // Cleanup: Refresh enrolled courses when leaving this page to show updated progress
    return () => {
      console.log('🔄 CourseContentViewer unmounting - triggering enrolled courses refresh');
      // Emit final progress update before leaving
      const finalProgress = calculateProgress();
      window.dispatchEvent(new CustomEvent('courseProgressUpdate', {
        detail: {
          courseId: courseId,
          progress: finalProgress,
          final: true
        }
      }));

      // Refresh enrolled courses to show updated progress
      window.dispatchEvent(new Event('refreshEnrolledCourses'));
    };
  }, [courseId]);

  // Select first content when modules are loaded (only from first module which is always unlocked)
  useEffect(() => {
    if (modules.length > 0 && !selectedContent) {
      // First module is always unlocked, so we can auto-select its content
      if (modules[0].contents && modules[0].contents.length > 0) {
        // Find the first video content, or fallback to first content of any type
        const firstVideo = modules[0].contents.find(c =>
          c.type?.toLowerCase() === 'video' || c.type?.toLowerCase() === 'lecture'
        );
        const contentToSelect = firstVideo || modules[0].contents[0];

        setSelectedContent(contentToSelect);
        // Auto-expand first module
        setExpandedModules(prev => ({ ...prev, [modules[0].id]: true }));

        console.log('Auto-selected first content:', contentToSelect.title);
      }
    }
  }, [modules]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Try new organized content endpoint first
      try {
        const contentResponse = await axios.get(
          `http://localhost:4000/course/${courseId}/content`,
          { headers }
        );

        const contentData = contentResponse.data;
        console.log('Course content data (NEW):', contentData);

        setCourse(contentData.course);

        // Process modules with content using the new organized structure
        const processedModules = contentData.modules.map(module => {
          const contents = (module.content || []).map((content, index) => {
            // Build URL - use file_path if available, otherwise check for external links
            let url = '';
            if (content.file_path) {
              url = content.file_path.startsWith('http')
                ? content.file_path
                : `http://localhost:4000/${content.file_path}`;
            }

            return {
              id: `${content.type}-${module.id}-${index}`,
              title: content.title,
              type: content.type,
              url: url,
              external_link: content.external_link || null,
              description: content.description || '',
              filename: content.filename,
              uploadDate: content.upload_date,
              duration: content.duration
            };
          });

          return {
            id: module.id,
            title: module.title || module.name,
            description: module.description,
            order: module.order,
            contents: contents
          };
        });

        // Sort modules by order
        processedModules.sort((a, b) => (a.order || 0) - (b.order || 0));

        setModules(processedModules);
        console.log('Processed modules (NEW):', processedModules);

        // Store quizzes if available
        if (contentData.quizzes && contentData.quizzes.length > 0) {
          setQuizzes(contentData.quizzes);
          console.log('Quizzes loaded:', contentData.quizzes);
        }

        // Store questions if available
        if (contentData.questions && contentData.questions.length > 0) {
          setQuestions(contentData.questions);
          console.log('Questions loaded:', contentData.questions);
        }

        // Expand first module by default (first module is always unlocked)
        if (processedModules.length > 0) {
          setExpandedModules({ [processedModules[0].id]: true });
        }

        return; // Exit early if new endpoint works

      } catch (newEndpointError) {
        console.warn('New content endpoint failed, falling back to old method:', newEndpointError);
      }

      // FALLBACK: Old method
      await fetchCourseDataFallback(headers);

    } catch (error) {
      console.error('Error fetching course data:', error);
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseDataFallback = async (headers) => {
    // Fetch course details
    const courseResponse = await axios.get(
      `http://localhost:4000/course/${courseId}`,
      { headers }
    );
    const courseData = courseResponse.data;
    setCourse(courseData);
    console.log('Course data (FALLBACK):', courseData);

    // Fetch modules for this course
    try {
      const modulesResponse = await axios.get(
        `http://localhost:4000/courses/${courseId}/modules`,
        { headers }
      );

      const modulesData = modulesResponse.data || [];
      console.log('Modules data (FALLBACK):', modulesData);

      // Process modules with their content (lectures and PDFs) - FALLBACK METHOD
      const processedModules = modulesData.map(module => {
        const contents = [];
        console.log(`Processing module (fallback): ${module.name} (ID: ${module.id})`);

        // Get lectures for this module from course data
        const courseLectures = courseData.lectures || [];

        // Improved filtering logic with multiple fallback options
        const moduleLectures = courseLectures.filter(lecture => {
          if (lecture.module_id && module.id && lecture.module_id === module.id) {
            return true;
          }

          if (lecture.module_name && module.name) {
            const lectureMod = lecture.module_name.toLowerCase().trim();
            const modName = module.name.toLowerCase().trim();
            return lectureMod === modName;
          }

          return false;
        });

        // Add video lectures
        moduleLectures.forEach((lecture, index) => {
          const videoUrl = `http://localhost:4000/${lecture.file_path}`;
          contents.push({
            id: `lecture-${module.id}-${index}`,
            title: lecture.original_name || lecture.filename,
            type: 'video',
            url: videoUrl,
            description: `Lecture ${lecture.sequence_number || index + 1}`,
            filename: lecture.filename,
            uploadDate: lecture.upload_date
          });
        });

        // Get PDFs for this module from course data
        const coursePdfs = courseData.pdfs || [];

        const modulePdfs = coursePdfs.filter(pdf => {
          if (pdf.module_id && module.id && pdf.module_id === module.id) {
            return true;
          }

          if (pdf.module_name && module.name) {
            const pdfMod = pdf.module_name.toLowerCase().trim();
            const modName = module.name.toLowerCase().trim();
            return pdfMod === modName;
          }

          return false;
        });

        // Add PDF documents
        modulePdfs.forEach((pdf, index) => {
          const pdfUrl = `http://localhost:4000/${pdf.file_path}`;
          contents.push({
            id: `pdf-${module.id}-${index}`,
            title: pdf.original_name || pdf.filename,
            type: 'pdf',
            duration: formatFileSize(pdf.file_size),
            url: pdfUrl,
            description: `PDF Document ${index + 1}`,
            filename: pdf.filename,
            uploadDate: pdf.upload_date
          });
        });

        console.log(`Found ${moduleLectures.length} lectures for module ${module.name}`);
        console.log(`Found ${modulePdfs.length} PDFs for module ${module.name}`);

        return {
          id: module.id,
          title: module.name || module.title,
          description: module.description,
          order: module.order,
          contents: contents
        };
      });

      // Sort modules by order
      processedModules.sort((a, b) => (a.order || 0) - (b.order || 0));

      // Handle case where there are lectures/PDFs but no modules created yet
      const allLectures = courseData.lectures || [];
      const allPdfs = courseData.pdfs || [];

      if (processedModules.length === 0 && (allLectures.length > 0 || allPdfs.length > 0)) {
        // Create a fallback "general" module for unassigned content
        const generalModule = {
          id: 'general-fallback',
          title: 'Course Materials',
          description: 'All uploaded course materials',
          order: 1,
          contents: []
        };

        // Add all lectures to general module
        allLectures.forEach((lecture, index) => {
          const videoUrl = `http://localhost:4000/${lecture.file_path}`;
          generalModule.contents.push({
            id: `lecture-general-${index}`,
            title: lecture.original_name || lecture.filename,
            type: 'video',
            url: videoUrl,
            description: `Lecture ${lecture.sequence_number || index + 1}`,
            filename: lecture.filename,
            uploadDate: lecture.upload_date
          });
        });

        // Add all PDFs to general module
        allPdfs.forEach((pdf, index) => {
          const pdfUrl = `http://localhost:4000/${pdf.file_path}`;
          generalModule.contents.push({
            id: `pdf-general-${index}`,
            title: pdf.original_name || pdf.filename,
            type: 'pdf',
            duration: formatFileSize(pdf.file_size),
            url: pdfUrl,
            description: `PDF Document ${index + 1}`,
            filename: pdf.filename,
            uploadDate: pdf.upload_date
          });
        });

        processedModules.push(generalModule);
      }

      setModules(processedModules);

      // Expand first module by default (first module is always unlocked)
      if (processedModules.length > 0) {
        setExpandedModules({ [processedModules[0].id]: true });
      }

    } catch (moduleError) {
      console.error('Error fetching modules (fallback):', moduleError);
      setModules([]);
    }
  };

  // Helper function to format file size as readable string
  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = (bytes / (1024 * 1024)).toFixed(1);
    return `\${mb} MB`;
  };

  // Fetch user progress for the course
  const fetchUserProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.get(
        `http://localhost:4000/api/progress/course/${courseId}`,
        { headers }
      );

      if (response.data.success) {
        const progressData = {};
        const completedSet = new Set();
        const watchedSet = new Set();
        const videoProgressData = {};

        response.data.progress.forEach(item => {
          progressData[item.content_id] = item;

          if (item.completed) {
            completedSet.add(item.content_id);
            console.log(`Loaded completed item from server: ${item.content_id}`);
          }

          if (item.content_type === 'video' && item.completion_percentage >= 95) {
            watchedSet.add(item.content_id);
          }

          if (item.content_type === 'video') {
            videoProgressData[item.content_id] = {
              currentTime: item.last_position,
              duration: item.total_duration,
              progress: item.completion_percentage
            };
          }
        });

        setUserProgress(progressData);
        setCompletedItems(completedSet);
        setWatchedVideos(watchedSet);
        setVideoProgress(videoProgressData);
        setProgressStats(response.data.stats);

        console.log(`Loaded ${completedSet.size} completed items from server`);
      }
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }
  };

  // Fetch module completion status
  const fetchModuleCompletion = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || modules.length === 0) return;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Prepare modules data
      const modulesData = modules.map(module => ({
        module_id: module.id,
        content_ids: (module.contents || []).map(content => content.id)
      }));

      const response = await axios.post(
        `http://localhost:4000/api/progress/modules/check-completion/${courseId}`,
        { modules_data: modulesData },
        { headers }
      );

      if (response.data.success) {
        setCompletedModules(new Set(response.data.completed_modules));
      }
    } catch (error) {
      console.error('Error fetching module completion:', error);
    }
  };

  // Fetch module completion when modules are loaded and progress is fetched
  useEffect(() => {
    if (modules.length > 0 && Object.keys(userProgress).length >= 0) {
      fetchModuleCompletion();
    }
  }, [modules, courseId]);

  // Update progress on the server
  const updateProgressOnServer = async (contentId, moduleId, contentType, watchedDuration, totalDuration, completed = null) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No auth token found, skipping progress update');
        return;
      }

      setSyncStatus('syncing');

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const data = {
        course_id: courseId,
        content_id: contentId,
        module_id: moduleId,
        content_type: contentType,
        watched_duration: watchedDuration,
        total_duration: totalDuration,
        completed: completed
      };

      console.log('Updating progress:', {
        contentId,
        watched: Math.round(watchedDuration),
        total: Math.round(totalDuration),
        percentage: Math.round((watchedDuration / totalDuration) * 100) + '%'
      });

      const response = await axios.post(
        'http://localhost:4000/api/progress/update',
        data,
        { headers }
      );

      if (response.data.success) {
        // Update local progress state with server response
        setUserProgress(prev => ({
          ...prev,
          [contentId]: {
            ...prev[contentId],
            ...response.data.progress
          }
        }));

        // Update completed items if server says it's completed
        if (response.data.progress.completed) {
          setCompletedItems(prev => new Set([...prev, contentId]));
          if (contentType === 'video') {
            setWatchedVideos(prev => new Set([...prev, contentId]));
          }
          console.log(`Content ${contentId} marked as completed by server`);
        }

        // Emit course progress update event for dashboard
        window.dispatchEvent(new CustomEvent('courseProgressUpdate', {
          detail: {
            courseId: courseId,
            progress: calculateProgress(),
            contentId: contentId,
            completed: response.data.progress.completed
          }
        }));

        setSyncStatus('synced');
        console.log('Progress updated successfully:', response.data.progress);
      }
    } catch (error) {
      console.error('Error updating progress:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      setSyncStatus('error');
      setTimeout(() => setSyncStatus('synced'), 3000);

      // Don't throw - silently fail to avoid disrupting user experience
    }
  };

  // Mark content as complete on server
  const markCompleteOnServer = async (contentId, moduleId, contentType) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const data = {
        course_id: courseId,
        content_id: contentId,
        module_id: moduleId,
        content_type: contentType
      };

      const response = await axios.post(
        'http://localhost:4000/api/progress/mark-complete',
        data,
        { headers }
      );

      if (response.data.success) {
        // Update local state
        setCompletedItems(prev => new Set([...prev, contentId]));
        if (contentType === 'video') {
          setWatchedVideos(prev => new Set([...prev, contentId]));
        }

        // Emit course progress update event for dashboard
        window.dispatchEvent(new CustomEvent('courseProgressUpdate', {
          detail: {
            courseId: courseId,
            progress: calculateProgress(),
            contentId: contentId,
            completed: true
          }
        }));

        console.log(`🎯 Content ${contentId} marked as complete - emitted progress update event`);
      }
    } catch (error) {
      console.error('Error marking content as complete:', error);
    }
  };



  const toggleModule = (moduleId, moduleIndex) => {
    // Check if module is unlocked
    if (!isModuleUnlocked(moduleIndex)) {
      // Show tooltip for locked module
      setShowLockTooltip(moduleId);
      setTimeout(() => setShowLockTooltip(null), 2000);
      return;
    }

    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleContentSelect = (content, moduleIndex) => {
    // Check if module is unlocked before allowing content selection
    if (!isModuleUnlocked(moduleIndex)) {
      return;
    }
    setSelectedContent(content);
  };

  const toggleComplete = (content) => {
    // Check if content can be marked as complete
    if (!canMarkAsComplete(content)) {
      // Show tooltip for videos that haven't been watched fully
      if (content.type?.toLowerCase() === 'video' || content.type?.toLowerCase() === 'lecture') {
        setShowVideoTooltip(true);
        setTimeout(() => setShowVideoTooltip(false), 3000);
      }
      return;
    }

    const isCurrentlyCompleted = completedItems.has(content.id);

    // Find module ID for this content
    let moduleId = null;
    modules.forEach(module => {
      module.contents?.forEach(moduleContent => {
        if (moduleContent.id === content.id) {
          moduleId = module.id;
        }
      });
    });

    if (isCurrentlyCompleted) {
      // Uncomplete the item
      setCompletedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(content.id);
        return newSet;
      });

      // Update on server (set completed to false)
      updateProgressOnServer(
        content.id,
        moduleId,
        content.type || 'video',
        userProgress[content.id]?.watched_duration || 0,
        userProgress[content.id]?.total_duration || 1,
        false
      );
    } else {
      // Complete the item
      setCompletedItems(prev => new Set([...prev, content.id]));

      // Mark as complete on server
      markCompleteOnServer(content.id, moduleId, content.type || 'video');

      // Emit immediate progress update event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('courseProgressUpdate', {
          detail: {
            courseId: courseId,
            progress: calculateProgress(),
            contentId: content.id,
            completed: true
          }
        }));
      }, 100); // Small delay to ensure state is updated
    }
  };

  const calculateProgress = () => {
    // Use server-side stats if available
    if (progressStats.total_items > 0) {
      return Math.round(progressStats.completion_percentage);
    }

    // Fallback to client-side calculation
    const totalItems = modules.reduce((sum, module) =>
      sum + (module.contents?.length || 0), 0
    );
    if (totalItems === 0) return 0;

    const progressPercentage = Math.round((completedItems.size / totalItems) * 100);
    console.log(`📊 Progress calculation: ${completedItems.size}/${totalItems} = ${progressPercentage}%`);
    return progressPercentage;
  };

  // Check if a module is unlocked (first module is always unlocked)
  const isModuleUnlocked = (moduleIndex) => {
    if (moduleIndex === 0) return true; // First module is always unlocked
    return completedModules.has(modules[moduleIndex - 1]?.id);
  };

  // Check if all content in a module is completed
  const isModuleCompleted = (module) => {
    if (!module.contents || module.contents.length === 0) return false;
    return module.contents.every(content => completedItems.has(content.id));
  };

  // Video progress tracking functions - OPTIMIZED for speed changes and seeking
  const handleVideoTimeUpdate = (event, contentId) => {
    const video = event.target;
    const currentTime = video.currentTime;
    const duration = video.duration;

    if (!duration || duration === 0) return;

    const progress = (currentTime / duration) * 100;

    // Update local progress state
    setVideoProgress(prev => ({
      ...prev,
      [contentId]: {
        currentTime: currentTime,
        duration: duration,
        progress: progress
      }
    }));

    // Track watched segments to handle seeking
    setWatchedSegments(prev => {
      const segments = prev[contentId] || [];
      const currentSegment = Math.floor(currentTime / 5); // 5-second segments

      if (!segments.includes(currentSegment)) {
        return {
          ...prev,
          [contentId]: [...segments, currentSegment]
        };
      }
      return prev;
    });

    // Optimized update logic - Update every 3 seconds OR on significant progress
    const now = Date.now();
    const lastUpdate = lastUpdateTime[contentId] || 0;
    const timeSinceLastUpdate = now - lastUpdate;

    // Update conditions (more frequent for better tracking):
    // 1. Every 3 seconds
    // 2. When reaching 25%, 50%, 75%, 95% milestones
    // 3. When seeking ahead (big time jump)
    const shouldUpdate =
      timeSinceLastUpdate >= 3000 || // Every 3 seconds
      (progress >= 95 && !watchedVideos.has(contentId)) || // Near completion
      Math.abs(currentTime - (userProgress[contentId]?.last_position || 0)) > 10; // Big seek

    if (shouldUpdate && selectedContent) {
      setLastUpdateTime(prev => ({ ...prev, [contentId]: now }));

      // Find module ID for this content
      let moduleId = null;
      modules.forEach(module => {
        module.contents?.forEach(content => {
          if (content.id === contentId) {
            moduleId = module.id;
          }
        });
      });

      // Calculate actual watched percentage based on segments
      const segments = watchedSegments[contentId] || [];
      const totalSegments = Math.ceil(duration / 5);
      const watchedPercentage = (segments.length / totalSegments) * 100;

      // Use the higher of current position percentage or watched segments percentage
      const effectiveProgress = Math.max(progress, watchedPercentage);

      updateProgressOnServer(
        contentId,
        moduleId,
        selectedContent.type || 'video',
        currentTime,
        duration,
        effectiveProgress >= 95 ? true : null  // Auto-complete at 95%
      );
    }

    // Mark video as watched when it reaches 95% completion
    if (progress >= 95 && !watchedVideos.has(contentId)) {
      setWatchedVideos(prev => new Set([...prev, contentId]));

      // Automatically mark as completed when reaching 95%
      setCompletedItems(prev => new Set([...prev, contentId]));

      console.log(`Video ${contentId} auto-completed at 95%`);
    }
  };

  const handleVideoEnded = (contentId) => {
    // Mark video as fully watched when it ends
    setWatchedVideos(prev => new Set([...prev, contentId]));

    // Automatically mark as completed when video ends
    setCompletedItems(prev => new Set([...prev, contentId]));

    console.log(`Video ${contentId} completed at end`);

    // Update progress on server as completed
    if (selectedContent) {
      let moduleId = null;
      modules.forEach(module => {
        module.contents?.forEach(content => {
          if (content.id === contentId) {
            moduleId = module.id;
          }
        });
      });

      const video = document.querySelector('video');
      if (video) {
        updateProgressOnServer(
          contentId,
          moduleId,
          selectedContent.type || 'video',
          video.duration,
          video.duration,
          true // Mark as completed
        );
      }
    }
  };

  // Handle video seeking (jumping ahead/back)
  const handleVideoSeeking = (event, contentId) => {
    const video = event.target;
    console.log(`Video seeking to: ${video.currentTime}s`);

    // Update immediately when user seeks
    if (selectedContent) {
      let moduleId = null;
      modules.forEach(module => {
        module.contents?.forEach(content => {
          if (content.id === contentId) {
            moduleId = module.id;
          }
        });
      });

      updateProgressOnServer(
        contentId,
        moduleId,
        selectedContent.type || 'video',
        video.currentTime,
        video.duration
      );
    }
  };

  // Handle playback rate change (2x, 3x speed)
  const handlePlaybackRateChange = (event, contentId) => {
    const video = event.target;
    setCurrentPlaybackRate(video.playbackRate);
    console.log(`Playback rate changed to: ${video.playbackRate}x`);
    // No special handling needed - timeUpdate will track correctly
  };

  // Check if content can be marked as complete
  const canMarkAsComplete = (content) => {
    if (!content) return false;

    // For videos, check if they've been watched to completion
    if (content.type?.toLowerCase() === 'video' || content.type?.toLowerCase() === 'lecture') {
      return watchedVideos.has(content.id);
    }

    // For non-video content (PDFs, etc.), allow immediate completion
    return true;
  };

  // Update module completion status when content is marked as complete
  useEffect(() => {
    const checkModuleCompletion = async () => {
      let shouldFetchCompletion = false;

      modules.forEach(module => {
        const wasCompleted = completedModules.has(module.id);
        const isCompleted = isModuleCompleted(module);

        if (!wasCompleted && isCompleted) {
          setCompletedModules(prev => new Set([...prev, module.id]));
          shouldFetchCompletion = true;

          // Auto-expand next module when current one is completed
          const currentIndex = modules.findIndex(m => m.id === module.id);
          if (currentIndex >= 0 && currentIndex < modules.length - 1) {
            const nextModule = modules[currentIndex + 1];
            setExpandedModules(prev => ({ ...prev, [nextModule.id]: true }));
          }
        } else if (wasCompleted && !isCompleted) {
          setCompletedModules(prev => {
            const newSet = new Set(prev);
            newSet.delete(module.id);
            return newSet;
          });
          shouldFetchCompletion = true;
        }
      });

      // Update server with module completion status
      if (shouldFetchCompletion) {
        updateModuleCompletionOnServer();
      }
    };

    checkModuleCompletion();
  }, [completedItems, modules]);

  // Update module completion on server
  const updateModuleCompletionOnServer = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || modules.length === 0) return;

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Prepare modules data for checking completion
      const modulesData = modules.map(module => ({
        module_id: module.id,
        content_ids: (module.contents || []).map(content => content.id)
      }));

      const response = await axios.post(
        `http://localhost:4000/api/progress/modules/check-completion/${courseId}`,
        { modules_data: modulesData },
        { headers }
      );

      if (response.data.success) {
        // Update completed modules from server response
        setCompletedModules(new Set(response.data.completed_modules));
      }
    } catch (error) {
      console.error('Error updating module completion:', error);
    }
  };

  const getContentIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'video':
      case 'lecture':
        return <VideoCameraIcon className="w-5 h-5" />;
      case 'pdf':
      case 'document':
        return <DocumentIcon className="w-5 h-5" />;
      case 'quiz':
        return <QuestionMarkCircleIcon className="w-5 h-5" />;
      case 'assignment':
        return <PencilSquareIcon className="w-5 h-5" />;
      default:
        return <DocumentTextIcon className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading your course content...</p>
          <p className="text-gray-400 text-sm mt-2">Please wait while we prepare your learning experience</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Course not found</h2>
          <button
            onClick={() => {
              // Trigger refresh of enrolled courses to show updated progress
              window.dispatchEvent(new Event('refreshEnrolledCourses'));
              navigate(-1);
            }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                // Trigger refresh of enrolled courses to show updated progress
                window.dispatchEvent(new Event('refreshEnrolledCourses'));
                navigate(-1);
              }}
              className="flex items-center space-x-2 text-white hover:text-gray-200 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <div className="h-6 w-px bg-gray-700"></div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-white font-bold text-lg truncate max-w-md">
                  {course.title || course.course_name}
                </h1>
                {course.program_name && (
                  <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded">
                    {course.program_name}
                  </span>
                )}
                {course.course_code && (
                  <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded">
                    {course.course_code}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex-1 bg-gray-700 rounded-full h-2 max-w-xs">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${calculateProgress()}%` }}
                  ></div>
                </div>
                <span className="text-sm text-white">{calculateProgress()}% complete</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Sync Status Indicator */}
            <div className="flex items-center space-x-2">
              {syncStatus === 'syncing' && (
                <div className="flex items-center space-x-2 text-yellow-400">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-xs">Syncing...</span>
                </div>
              )}
              {syncStatus === 'synced' && (
                <div className="flex items-center space-x-2 text-orange-400">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span className="text-xs">Synced</span>
                </div>
              )}
              {syncStatus === 'error' && (
                <div className="flex items-center space-x-2 text-red-400">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs">Sync error</span>
                </div>
              )}
            </div>

            {/* Playback Speed Indicator */}
            {currentPlaybackRate !== 1.0 && (
              <div className="flex items-center space-x-1 text-blue-400 bg-blue-900/30 px-2 py-1 rounded">
                <span className="text-xs font-medium">{currentPlaybackRate}x</span>
              </div>
            )}

            <button className="p-2 text-white hover:text-gray-200 transition-colors">
              <QuestionMarkCircleIcon className="w-6 h-6" />
              <span className="sr-only">Support</span>
            </button>
            <button className="p-2 text-white hover:text-gray-200 transition-colors">
              <PencilSquareIcon className="w-6 h-6" />
              <span className="sr-only">Notes</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Modules */}
        <aside className="w-96 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <div className="p-4">
            {/* Tab Switcher */}
            <div className="flex mb-4 bg-gray-900 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('content')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'content'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <DocumentTextIcon className="w-4 h-4 inline mr-2" />
                Content ({modules.reduce((sum, m) => sum + (m.contents?.length || 0), 0)})
              </button>
              <button
                onClick={() => setActiveTab('quizzes')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'quizzes'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <QuestionMarkCircleIcon className="w-4 h-4 inline mr-2" />
                Questions ({questions.length + quizzes.length})
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-4 bg-gray-900 rounded-lg p-3">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Course Progress</span>
                <span className="text-orange-400 font-medium">{calculateProgress()}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{completedItems.size} completed</span>
                <span>{modules.reduce((sum, m) => sum + (m.contents?.length || 0), 0)} total</span>
              </div>
            </div>

            {/* Course Info Card */}
            <div className="mb-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-3 border border-gray-700">
              <h3 className="text-white font-semibold text-sm mb-2">📚 Course Info</h3>
              <div className="space-y-1 text-xs">
                {course.program_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Program:</span>
                    <span className="text-purple-400">{course.program_name}</span>
                  </div>
                )}
                {course.duration_months && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-blue-400">{course.duration_months} months</span>
                  </div>
                )}
                {course.description && (
                  <p className="text-gray-500 mt-2 text-xs line-clamp-2">{course.description}</p>
                )}
              </div>
            </div>

            {activeTab === 'content' ? (
              <>
                <h2 className="text-white font-bold text-lg mb-4 flex items-center">
                  <DocumentTextIcon className="w-5 h-5 mr-2" />
                  Study Materials
                </h2>

                {/* Modules List */}
                <div className="space-y-2">
                  {modules.length === 0 ? (
                    <div className="text-white text-center py-8">
                      <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No modules available yet</p>
                    </div>
                  ) : (
                    modules.map((module, index) => {
                      const isUnlocked = isModuleUnlocked(index);
                      const isCompleted = completedModules.has(module.id);
                      const showTooltip = showLockTooltip === module.id;

                      return (
                        <div key={module.id || index} className="bg-gray-900 rounded-lg overflow-hidden relative">
                          {/* Lock Tooltip */}
                          {showTooltip && (
                            <div className="absolute top-0 left-0 right-0 z-10 bg-red-600 text-white text-xs px-3 py-2 rounded-t-lg">
                              🔒 Complete previous module to unlock
                            </div>
                          )}

                          {/* Module Header */}
                          <button
                            onClick={() => toggleModule(module.id, index)}
                            className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${isUnlocked
                              ? 'hover:bg-gray-700'
                              : 'opacity-60 cursor-not-allowed'
                              }`}
                          >
                            <div className="flex items-center space-x-3">
                              {/* Lock/Check Icon */}
                              <div className="flex-shrink-0">
                                {!isUnlocked ? (
                                  <LockClosedIcon className="w-4 h-4 text-red-400" />
                                ) : isCompleted ? (
                                  <CheckCircleIcon className="w-4 h-4 text-orange-500" />
                                ) : (
                                  <span className="w-4 h-4 border border-gray-500 rounded-full flex items-center justify-center">
                                    <span className="text-xs text-gray-400">{index + 1}</span>
                                  </span>
                                )}
                              </div>

                              <span className={`font-medium text-sm ${isUnlocked ? 'text-white' : 'text-gray-400'
                                }`}>
                                Module {index + 1}
                              </span>
                              <span className={`font-semibold text-sm ${isUnlocked ? 'text-white' : 'text-gray-400'
                                }`}>
                                {module.title || `Module \${index + 1}`}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              {!isUnlocked && (
                                <LockClosedIcon className="w-4 h-4 text-red-400" />
                              )}
                              {expandedModules[module.id] && isUnlocked ? (
                                <ChevronUpIcon className="w-5 h-5 text-white" />
                              ) : (
                                <ChevronDownIcon className={`w-5 h-5 ${isUnlocked ? 'text-white' : 'text-gray-400'
                                  }`} />
                              )}
                            </div>
                          </button>

                          {/* Module Contents */}
                          {expandedModules[module.id] && (
                            <div className="bg-gray-800">
                              {module.contents && module.contents.length > 0 ? (
                                module.contents.map((content, contentIndex) => {
                                  const isSelected = selectedContent?.id === content.id;
                                  const isCompleted = completedItems.has(content.id);

                                  return (
                                    <button
                                      key={content.id || contentIndex}
                                      onClick={() => handleContentSelect(content, index)}
                                      className={`w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-700 transition-colors \${
                                  isSelected ? 'bg-blue-900/30 border-l-4 border-blue-500' : ''
                                }`}
                                    >
                                      <div className={`flex-shrink-0 \${
                                  isCompleted ? 'text-orange-500' : 'text-white'
                                }`}>
                                        {isCompleted ? (
                                          <CheckCircleIcon className="w-5 h-5" />
                                        ) : (
                                          getContentIcon(content.type)
                                        )}
                                      </div>
                                      <div className="flex-1 text-left">
                                        <p className={`text-sm font-medium \${
                                    isSelected ? 'text-white' : 'text-gray-300'
                                  }`}>
                                          {content.title || 'Untitled'}
                                        </p>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {/* Video Progress Indicator */}
                                        {(content.type?.toLowerCase() === 'video' || content.type?.toLowerCase() === 'lecture') &&
                                          videoProgress[content.id] && !isCompleted && (
                                            <div className="w-8 text-xs text-gray-400">
                                              {Math.round(videoProgress[content.id].progress || 0)}%
                                            </div>
                                          )}

                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleComplete(content);
                                          }}
                                          disabled={!canMarkAsComplete(content)}
                                          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-colors ${isCompleted
                                            ? 'bg-orange-500 border-orange-500'
                                            : canMarkAsComplete(content)
                                              ? 'border-gray-500 hover:border-gray-400'
                                              : 'border-gray-600 opacity-50 cursor-not-allowed'
                                            }`}
                                        >
                                          {isCompleted && (
                                            <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                          )}
                                        </button>
                                      </div>
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="px-4 py-3 text-white text-sm">
                                  No content available in this module yet.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              /* Quizzes Tab */
              <div className="space-y-3">
                <h2 className="text-white font-bold text-lg mb-4 flex items-center">
                  <QuestionMarkCircleIcon className="w-5 h-5 mr-2" />
                  Question Papers & Tests
                </h2>

                {/* Questions Section */}
                {questions.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-purple-400 font-semibold text-sm mb-3 flex items-center">
                      <PencilSquareIcon className="w-4 h-4 mr-2" />
                      Practice Questions ({questions.length})
                    </h3>
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                      {questions.map((question, index) => (
                        <div
                          key={question.id || index}
                          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[24px] text-center">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-white text-sm mb-3">{question.question_text}</p>

                              {/* Options */}
                              <div className="grid grid-cols-1 gap-2 mb-3">
                                {question.option_a && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded font-medium">A</span>
                                    <span className="text-gray-400">{question.option_a}</span>
                                  </div>
                                )}
                                {question.option_b && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded font-medium">B</span>
                                    <span className="text-gray-400">{question.option_b}</span>
                                  </div>
                                )}
                                {question.option_c && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded font-medium">C</span>
                                    <span className="text-gray-400">{question.option_c}</span>
                                  </div>
                                )}
                                {question.option_d && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded font-medium">D</span>
                                    <span className="text-gray-400">{question.option_d}</span>
                                  </div>
                                )}
                              </div>

                              {/* Meta Info */}
                              <div className="flex flex-wrap gap-2 text-xs">
                                <span className="bg-orange-900/50 text-orange-400 px-2 py-1 rounded">
                                  ✅ Answer: {question.correct_answer}
                                </span>
                                {question.marks && (
                                  <span className="bg-blue-900/50 text-blue-400 px-2 py-1 rounded">
                                    🎯 {question.marks} Mark{question.marks > 1 ? 's' : ''}
                                  </span>
                                )}
                                {question.difficulty && (
                                  <span className={`px-2 py-1 rounded ${question.difficulty === 'easy' ? 'bg-orange-900/50 text-orange-400' :
                                    question.difficulty === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
                                      'bg-red-900/50 text-red-400'
                                    }`}>
                                    📊 {question.difficulty}
                                  </span>
                                )}
                              </div>

                              {/* Explanation */}
                              {question.explanation && (
                                <div className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-400">
                                  💡 {question.explanation}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Paper Sets / Quizzes Section */}
                {quizzes.length > 0 && (
                  <div>
                    <h3 className="text-blue-400 font-semibold text-sm mb-3 flex items-center">
                      <DocumentTextIcon className="w-4 h-4 mr-2" />
                      Test Papers ({quizzes.length})
                    </h3>
                    {quizzes.map((quiz, index) => (
                      <div
                        key={quiz.id || index}
                        className="bg-gray-900 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer mb-2"
                        onClick={() => navigate(`/student/test/${quiz.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-white font-medium text-sm mb-1">{quiz.name}</h3>
                            <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                              <span className="bg-purple-900/50 px-2 py-1 rounded">
                                📝 {quiz.questions} Questions
                              </span>
                              <span className="bg-blue-900/50 px-2 py-1 rounded">
                                ⏱️ {quiz.duration} min
                              </span>
                              <span className="bg-orange-900/50 px-2 py-1 rounded">
                                🎯 {quiz.total_marks || quiz.marks * quiz.questions} Marks
                              </span>
                            </div>
                            {quiz.description && (
                              <p className="text-gray-500 text-xs mt-2">{quiz.description}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${quiz.status === 'active'
                            ? 'bg-orange-900/50 text-orange-400'
                            : 'bg-yellow-900/50 text-yellow-400'
                            }`}>
                            {quiz.status === 'active' ? 'Available' : 'Upcoming'}
                          </span>
                        </div>
                        <button
                          className="mt-3 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/student/test/${quiz.id}`);
                          }}
                        >
                          Start Test
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {questions.length === 0 && quizzes.length === 0 && (
                  <div className="text-center py-8">
                    <QuestionMarkCircleIcon className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                    <p className="text-gray-400">No questions or tests available for this course</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Right Content Area - Video/Content Player */}
        <main className="flex-1 bg-black overflow-y-auto">
          {selectedContent ? (
            <div className="h-full flex flex-col">
              {/* Content Display Area */}
              <div className="flex-1 flex items-center justify-center bg-black">
                {selectedContent.type?.toLowerCase() === 'video' || selectedContent.type?.toLowerCase() === 'lecture' ? (
                  <div className="w-full h-full max-h-[70vh] flex items-center justify-center px-8 py-6">
                    {/* Check if it's an external link (YouTube, etc.) */}
                    {selectedContent.external_link ? (
                      // External video (YouTube, Vimeo, etc.)
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        {selectedContent.external_link.includes('youtube.com') || selectedContent.external_link.includes('youtu.be') ? (
                          <iframe
                            src={selectedContent.external_link.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
                            title={selectedContent.title}
                            className="w-full h-full rounded-lg shadow-2xl"
                            style={{ minHeight: '500px' }}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <div className="text-center">
                            <a
                              href={selectedContent.external_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                              <PlayIcon className="w-5 h-5 mr-2" />
                              Open Video in New Tab
                            </a>
                            <p className="text-gray-400 mt-4">{selectedContent.external_link}</p>
                          </div>
                        )}
                      </div>
                    ) : selectedContent.url ? (
                      // Local video file
                      <video
                        src={selectedContent.url}
                        controls
                        autoPlay
                        className="w-full h-full rounded-lg shadow-2xl"
                        poster={selectedContent.thumbnail}
                        onTimeUpdate={(e) => handleVideoTimeUpdate(e, selectedContent.id)}
                        onEnded={() => handleVideoEnded(selectedContent.id)}
                        onSeeking={(e) => handleVideoSeeking(e, selectedContent.id)}
                        onRateChange={(e) => handlePlaybackRateChange(e, selectedContent.id)}
                        onLoadedMetadata={(e) => {
                          console.log('✅ Video loaded successfully:', selectedContent.title);
                          console.log('   Video URL:', selectedContent.url);
                          // Restore video position from saved progress
                          const savedProgress = userProgress[selectedContent.id];
                          if (savedProgress && savedProgress.last_position > 0 && !savedProgress.completed) {
                            e.target.currentTime = savedProgress.last_position;
                          }
                        }}
                        onError={(e) => {
                          console.error('❌ Video failed to load:', selectedContent.title);
                          console.error('   Video URL:', selectedContent.url);
                          console.error('   Error details:', e.target.error);
                        }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <div className="text-center text-white">
                        <VideoCameraIcon className="w-24 h-24 mx-auto mb-6 opacity-50" />
                        <p className="text-xl mb-2">Video not available</p>
                        <p className="text-gray-400 text-sm">No video URL provided for this content</p>
                      </div>
                    )}
                  </div>
                ) : selectedContent.type?.toLowerCase() === 'pdf' || selectedContent.type?.toLowerCase() === 'document' ? (
                  <div className="w-full h-full flex flex-col px-4 py-4">
                    {/* PDF Viewer */}
                    <div className="flex-1 bg-white rounded-lg overflow-hidden shadow-lg">
                      <iframe
                        src={selectedContent.url}
                        title={selectedContent.title}
                        className="w-full h-full border-0"
                        style={{ minHeight: '600px' }}
                      >
                        <p className="text-center p-8">
                          Your browser does not support displaying PDFs.
                          {/* <a
                            href={selectedContent.url}
                            download
                            className="text-blue-600 hover:text-blue-800 underline ml-1"
                          >
                            Download the PDF
                          </a> */}
                        </p>
                      </iframe>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-white p-12">
                    <DocumentTextIcon className="w-24 h-24 text-white mx-auto mb-6" />
                    <h3 className="text-2xl font-bold mb-4">{selectedContent.title}</h3>
                    <p className="text-white">{selectedContent.description || 'Content will be available here'}</p>
                  </div>
                )}
              </div>

              {/* Content Info Section */}
              <div className="bg-gray-900 border-t border-gray-800 p-6">
                <div className="max-w-5xl mx-auto">
                  <div className="flex items-center justify-between mb-4">
                    {/* Text Content */}
                    <div className="flex-1 mr-6">
                      <h2 className="text-white text-2xl font-bold mb-2">{selectedContent.title}</h2>
                      {/* <p className="text-white">{selectedContent.description || 'No description available'}</p> */}
                    </div>

                    {/* Buttons Row */}
                    <div className="flex items-center space-x-4">
                      {/* Download button for PDFs */}
                      {(selectedContent.type?.toLowerCase() === 'pdf' || selectedContent.type?.toLowerCase() === 'document') && (
                        <>
                          {/* <a
                            href={selectedContent.url}
                            download
                            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            <span>Download PDF</span>
                          </a> */}

                        </>
                      )}

                      {/* Mark as Complete Button with Video Progress Check */}
                      <div className="relative">
                        {showVideoTooltip && (
                          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-10">
                            📹 Watch the full video to unlock
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-600"></div>
                          </div>
                        )}

                        <button
                          onClick={() => toggleComplete(selectedContent)}
                          disabled={!canMarkAsComplete(selectedContent)}
                          className={`px-6 py-3 rounded-lg font-medium transition-colors ${canMarkAsComplete(selectedContent)
                            ? completedItems.has(selectedContent.id)
                              ? 'bg-orange-600 hover:bg-orange-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-60'
                            }`}
                        >
                          {completedItems.has(selectedContent.id)
                            ? '✓ Completed'
                            : canMarkAsComplete(selectedContent)
                              ? 'Mark as Complete'
                              : (selectedContent.type?.toLowerCase() === 'video' || selectedContent.type?.toLowerCase() === 'lecture')
                                ? `📹 Watch Video ${(videoProgress[selectedContent.id]?.progress || 0) > 0 ? `(${Math.round(videoProgress[selectedContent.id]?.progress)}%)` : 'to Unlock'}`
                                : 'Mark as Complete'
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-white">
                <PlayIcon className="w-24 h-24 mx-auto mb-6 opacity-50" />
                {modules.length === 0 ? (
                  <>
                    <p className="text-xl mb-2">Loading course content...</p>
                    <p className="text-gray-400 text-sm">Please wait while we fetch your learning materials</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl mb-2">No content available</p>
                    <p className="text-gray-400 text-sm">This course doesn't have any uploaded content yet</p>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CourseContentViewer;
