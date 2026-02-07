import { useState, useEffect } from 'react';
import axios from 'axios';
import { getUserData } from '../../utils/authUtils';
import branchStudentDashboardService from '../../services/branchStudentDashboardService';

const API_BASE_URL = 'http://localhost:4000';

const StudentVideoClasses = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [selectedCourse, setSelectedCourse] = useState('All Courses');
  const [selectedProgram, setSelectedProgram] = useState('All Programs');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [filteredVideos, setFilteredVideos] = useState([]);

  // Dynamic data states
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [onlineTests, setOnlineTests] = useState([]);
  const [paperSets, setPaperSets] = useState([]);
  const [testAttempts, setTestAttempts] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [allTests, setAllTests] = useState([]);

  // Test modal states
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [testQuestions, setTestQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [testStartTime, setTestStartTime] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [selectedSubject, selectedCourse, selectedProgram, searchQuery, videos]);

  // Helper function to convert YouTube URLs to embed format
  const convertToEmbedUrl = (url) => {
    if (!url) return '';

    // If already an embed URL, return as is
    if (url.includes('/embed/')) {
      return url;
    }

    // Convert various YouTube URL formats to embed format
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);

    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }

    // If not a YouTube URL, return as is (could be direct video file or other platform)
    return url;
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDashboardData(),
        loadCourses(),
        loadPrograms(),
        loadOnlineTests(),
        loadPaperSets(),
        loadVideoClasses(),
        loadStudyMaterials()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const userData = getUserData();

      const isBranchStudent = branchStudentDashboardService.isBranchStudent();

      if (isBranchStudent) {
        const data = await branchStudentDashboardService.getDashboardData();
        setDashboardData(data);
        console.log('✅ Dashboard data loaded:', data);
      }
    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error);
    }
  };

  const loadCourses = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const isBranchStudent = branchStudentDashboardService.isBranchStudent();

      if (isBranchStudent) {
        // Try service method first
        try {
          const data = await branchStudentDashboardService.getEnrolledCourses();
          console.log('✅ Courses loaded from service:', data);
          console.log('✅ Courses array:', data.courses);
          console.log('✅ First course structure:', data.courses?.[0]);

          if (data.courses && data.courses.length > 0) {
            setCourses(data.courses);
            return;
          }
        } catch (serviceError) {
          console.log('⚠️ Service call failed, trying direct API:', serviceError);
        }

        // Fallback: Try direct API call
        const userData = getUserData();
        const params = new URLSearchParams();
        if (userData.branch_code) params.append('branch_code', userData.branch_code);
        if (userData.franchise_code) params.append('franchise_code', userData.franchise_code);

        const response = await axios.get(
          `${API_BASE_URL}/api/branch-courses/courses${params.toString() ? '?' + params.toString() : ''}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('✅ Courses API response:', response.data);
        console.log('✅ Courses API response structure:', Object.keys(response.data));

        // Extract courses from response - check multiple structures
        let coursesData = [];
        if (Array.isArray(response.data)) {
          coursesData = response.data;
        } else if (response.data.courses) {
          coursesData = response.data.courses;
        } else if (response.data.data) {
          coursesData = Array.isArray(response.data.data) ? response.data.data : response.data.data.courses || [];
        }

        console.log('✅ Courses from response:', coursesData);
        console.log('✅ Setting courses to:', coursesData);
        setCourses(coursesData);
      } else {
        // Regular student API
        const response = await axios.get(
          `${API_BASE_URL}/api/students/courses`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        setCourses(response.data.courses || []);
      }
    } catch (error) {
      console.error('❌ Failed to load courses:', error);
    }
  };

  const loadPrograms = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const isBranchStudent = branchStudentDashboardService.isBranchStudent();
      const userData = getUserData();

      if (isBranchStudent) {
        // Fetch branch programs with branch_code and franchise_code
        const params = new URLSearchParams();
        if (userData.branch_code) params.append('branch_code', userData.branch_code);
        if (userData.franchise_code) params.append('franchise_code', userData.franchise_code);

        const response = await axios.get(
          `${API_BASE_URL}/api/branch-programs/programs${params.toString() ? '?' + params.toString() : ''}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('✅ Programs API full response:', response);
        console.log('✅ Programs response data:', response.data);

        // Extract programs from response - check multiple structures
        let programsData = [];
        if (Array.isArray(response.data)) {
          programsData = response.data;
        } else if (response.data.programs) {
          programsData = response.data.programs;
        } else if (response.data.data) {
          programsData = Array.isArray(response.data.data) ? response.data.data : response.data.data.programs || [];
        }

        console.log('✅ Programs array:', programsData);
        console.log('✅ Programs array length:', programsData.length);
        console.log('✅ First program structure:', programsData?.[0]);
        console.log('✅ Setting programs state with:', programsData);
        setPrograms(programsData);
      } else {
        // Fetch regular programs
        const response = await axios.get(
          `${API_BASE_URL}/syllabuses/programs`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        setPrograms(response.data.programs || []);
        console.log('✅ Programs loaded:', response.data.programs);
      }
    } catch (error) {
      console.error('❌ Failed to load programs:', error);
    }
  };

  const loadOnlineTests = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const userData = getUserData();
      const isBranchStudent = branchStudentDashboardService.isBranchStudent();

      if (isBranchStudent) {
        const data = await branchStudentDashboardService.getQuizzes();
        setOnlineTests(data.quizzes || []);

        // Test attempts endpoint doesn't exist yet, skip loading
        // TODO: Implement test-attempts endpoint in backend
        setTestAttempts([]);

        console.log('✅ Tests loaded:', data.quizzes);
      }
    } catch (error) {
      console.error('❌ Failed to load online tests:', error);
    }
  };

  const loadPaperSets = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const isBranchStudent = branchStudentDashboardService.isBranchStudent();

      if (isBranchStudent) {
        console.log('📄 [PaperSets] Fetching paper sets...');
        const response = await axios.get(
          `${API_BASE_URL}/api/branch-paper-sets/paper-sets`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const paperSetsData = response.data.paper_sets || [];
        setPaperSets(paperSetsData);
        console.log('✅ Paper sets loaded:', paperSetsData);

        // Combine quizzes and paper sets into allTests
        const combined = [
          ...onlineTests.map(test => ({ ...test, type: 'quiz' })),
          ...paperSetsData.map(ps => ({
            id: ps._id || ps.id,
            title: ps.paperName || ps.paper_name,
            description: ps.description || `${ps.courseName} - ${ps.courseCategory}`,
            total_questions: ps.numberOfQuestions || 0,
            time_limit: ps.timeLimit || 0,
            course: ps.courseName,
            category: ps.courseCategory,
            marks_per_question: ps.perQuestionMark || 1,
            type: 'paper_set',
            status: ps.status
          }))
        ];
        setAllTests(combined);
        console.log('✅ Combined tests:', combined);
      }
    } catch (error) {
      console.error('❌ Failed to load paper sets:', error);
    }
  };

  const loadStudyMaterials = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const isBranchStudent = branchStudentDashboardService.isBranchStudent();

      if (isBranchStudent) {
        const data = await branchStudentDashboardService.getStudyMaterials();
        setStudyMaterials(data.study_materials || []);

        // Load subjects from backend API
        try {
          const subjectsResponse = await axios.get(
            `${API_BASE_URL}/api/branch-subjects/subjects`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log('✅ Subjects API full response:', subjectsResponse);
          console.log('✅ Subjects API response data:', subjectsResponse.data);

          // Extract subjects from response - check multiple structures
          let subjectsList = [];
          if (Array.isArray(subjectsResponse.data)) {
            subjectsList = subjectsResponse.data;
          } else if (subjectsResponse.data.subjects) {
            subjectsList = subjectsResponse.data.subjects;
          } else if (subjectsResponse.data.data) {
            subjectsList = Array.isArray(subjectsResponse.data.data) ? subjectsResponse.data.data : subjectsResponse.data.data.subjects || [];
          }

          console.log('✅ Subjects list:', subjectsList);
          console.log('✅ Subjects list length:', subjectsList.length);
          console.log('✅ First subject structure:', subjectsList?.[0]);
          const subjectNames = subjectsList
            .map(s => {
              if (typeof s === 'string') return s;
              return s.subject_name || s.name || 'Unknown Subject';
            })
            .filter(Boolean);
          console.log('✅ Subject names extracted:', subjectNames);
          console.log('✅ Setting subjects state with:', subjectNames);
          setSubjects(subjectNames);
        } catch (subjectError) {
          console.error('❌ Failed to load subjects, falling back to study materials:', subjectError);
          // Fallback: Extract unique subjects from study materials
          const uniqueSubjects = [...new Set(data.study_materials.map(m => m.subject).filter(Boolean))];
          setSubjects(uniqueSubjects);
        }

        console.log('✅ Study materials loaded:', data.study_materials);
      }
    } catch (error) {
      console.error('❌ Failed to load study materials:', error);
    }
  };

  const loadVideoClasses = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const userData = getUserData();

      // Check if this is a branch student
      const isBranchStudent = branchStudentDashboardService.isBranchStudent();
      console.log('🎓 [StudentVideoClasses] Is branch student:', isBranchStudent);

      if (isBranchStudent) {
        console.log('🏢 [StudentVideoClasses] Loading branch video materials...');

        try {
          // Use branch study materials API with video filter
          const response = await axios.get(
            `${API_BASE_URL}/api/branch-study-materials/materials?material_type=video`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          console.log('✅ [StudentVideoClasses] Branch videos API response:', response.data);
          console.log('✅ [StudentVideoClasses] Response keys:', Object.keys(response.data));
          console.log('✅ [StudentVideoClasses] Response.data type:', Array.isArray(response.data) ? 'Array' : typeof response.data);

          // Extract materials from response - check all possible structures
          let materials = [];
          if (Array.isArray(response.data)) {
            materials = response.data;
            console.log('📦 [StudentVideoClasses] Materials found as direct array');
          } else if (response.data.study_materials) {
            materials = response.data.study_materials;
            console.log('📦 [StudentVideoClasses] Materials found in study_materials');
          } else if (response.data.materials) {
            materials = response.data.materials;
            console.log('📦 [StudentVideoClasses] Materials found in materials');
          } else if (response.data.data) {
            if (Array.isArray(response.data.data)) {
              materials = response.data.data;
              console.log('📦 [StudentVideoClasses] Materials found in data array');
            } else if (response.data.data.study_materials) {
              materials = response.data.data.study_materials;
              console.log('📦 [StudentVideoClasses] Materials found in data.study_materials');
            }
          }
          console.log('📦 [StudentVideoClasses] Extracted materials:', materials);
          console.log('📦 [StudentVideoClasses] Materials count:', materials.length);

          // Transform materials to video format
          const transformedVideos = materials.map(material => {
            const rawUrl = material.external_link || material.file_url || material.video_url || '';
            const embedUrl = convertToEmbedUrl(rawUrl);

            console.log(`🔗 [Video URL] Raw: ${rawUrl} → Embed: ${embedUrl}`);

            return {
              id: material.id || material._id,
              title: material.material_name || material.title || 'Untitled Video',
              description: material.description || '',
              subject: material.subject_name || material.subject || 'General',
              course: material.course_name || material.course || '',
              program: material.program_name || material.program || '',
              instructor: material.uploaded_by || 'Instructor',
              video_url: embedUrl,
              url: embedUrl,
              duration: material.duration || '0:00',
              uploaded_at: material.created_at || material.uploaded_at,
              branch_code: material.branch_code,
              thumbnail: material.thumbnail || ''
            };
          });

          console.log('🎥 [StudentVideoClasses] Transformed videos:', transformedVideos);
          setVideos(transformedVideos);
          console.log(`✅ [StudentVideoClasses] Loaded ${transformedVideos.length} video materials`);

        } catch (branchError) {
          console.error('❌ [StudentVideoClasses] Failed to load branch video materials:', branchError);
          console.error('❌ Error details:', branchError.response?.data || branchError.message);

          // Set empty array on error
          setVideos([]);
        }

        setLoading(false);
        return;
      }

      console.log('👤 [StudentVideoClasses] Loading regular student video classes...');

      const response = await axios.get(
        `${API_BASE_URL}/api/students/video-classes`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const rawVideos = response.data.videos || [];
      // Convert YouTube URLs to embed format
      const videosWithEmbedUrls = rawVideos.map(video => ({
        ...video,
        video_url: convertToEmbedUrl(video.video_url || video.url),
        url: convertToEmbedUrl(video.video_url || video.url)
      }));

      setVideos(videosWithEmbedUrls);
      setLoading(false);
    } catch (error) {
      console.error('Error loading video classes:', error);
      // Set mock data if API fails
      const mockVideos = [
        {
          id: 1,
          title: 'Class-2 | How to Use Notepad in Computer | Notepad हिन्दी में आसानी से सीखे ? | ADCA Full Course',
          url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
          course: 'ADVANCE DIPLOMA IN COMPUTER APPLICATION (ADCA)',
          subject: 'FUNDAMENTAL OF COMPUTER',
          thumbnail: '',
          duration: '15:30',
          description: 'Sample video class'
        }
      ];
      setVideos(mockVideos);
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = videos;

    if (selectedProgram !== 'All Programs') {
      filtered = filtered.filter(video =>
        video.program === selectedProgram ||
        video.program_name === selectedProgram
      );
    }

    if (selectedCourse !== 'All Courses') {
      filtered = filtered.filter(video => video.course === selectedCourse);
    }

    if (selectedSubject !== 'All Subjects') {
      filtered = filtered.filter(video => video.subject === selectedSubject);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredVideos(filtered);
    if (filtered.length > 0 && currentVideoIndex >= filtered.length) {
      setCurrentVideoIndex(0);
    }
  };

  const handleStartTest = async (test) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      let questions = [];

      // Load questions based on test type
      if (test.type === 'paper_set') {
        // For paper sets, load questions from questions API
        console.log('📄 [StartTest] Loading paper set questions:', test.id);
        const response = await axios.get(
          `${API_BASE_URL}/api/questions/`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            params: {
              paper_set_id: test.id,
              limit: test.total_questions || 100
            }
          }
        );

        questions = (response.data.questions || []).map(q => ({
          id: q._id || q.id,
          question_text: q.question_text || q.question,
          text: q.question_text || q.question,
          options: q.options || [],
          correct_answer: q.correct_answer,
          marks: q.marks || test.marks_per_question || 1
        }));
      } else {
        // For regular quizzes
        console.log('📝 [StartTest] Loading quiz questions:', test.id);
        const response = await axios.get(
          `${API_BASE_URL}/api/tests/${test.id}/questions`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        questions = response.data.questions || [];
      }

      if (questions.length === 0) {
        alert('No questions available for this test.');
        setLoading(false);
        return;
      }

      setTestQuestions(questions);
      setSelectedTest(test);
      setCurrentQuestion(0);
      setAnswers({});
      setTestStartTime(new Date());
      setShowTestModal(true);
      console.log('✅ Test started:', test.title, 'Questions:', questions.length);
    } catch (error) {
      console.error('❌ Failed to start test:', error);
      alert('Failed to load test questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmitTest = async () => {
    if (isSubmitting) return;

    const unanswered = testQuestions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      const confirm = window.confirm(
        `You have ${unanswered.length} unanswered questions. Do you want to submit anyway?`
      );
      if (!confirm) return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('access_token');
      const endTime = new Date();
      const timeTaken = Math.round((endTime - testStartTime) / 1000); // seconds

      let response;

      if (selectedTest.type === 'paper_set') {
        // Submit paper set attempt
        console.log('📤 [SubmitTest] Submitting paper set attempt...');
        response = await axios.post(
          `${API_BASE_URL}/api/branch-paper-sets/submit`,
          {
            paper_set_id: selectedTest.id,
            answers: answers,
            time_taken: timeTaken,
            started_at: testStartTime.toISOString(),
            completed_at: endTime.toISOString()
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } else {
        // Submit regular quiz/test
        console.log('📤 [SubmitTest] Submitting quiz attempt...');
        response = await axios.post(
          `${API_BASE_URL}/api/tests/submit`,
          {
            test_id: selectedTest.id,
            answers: answers,
            time_taken: timeTaken,
            started_at: testStartTime.toISOString(),
            completed_at: endTime.toISOString()
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      const score = response.data.score || response.data.total_score || 0;
      const totalMarks = response.data.total_marks || response.data.max_score || testQuestions.length;
      const percentage = response.data.percentage || Math.round((score / totalMarks) * 100);

      alert(
        `Test submitted successfully!\n\n` +
        `Score: ${score}/${totalMarks}\n` +
        `Percentage: ${percentage}%\n` +
        `Time Taken: ${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s`
      );

      setShowTestModal(false);
      setSelectedTest(null);
      setTestQuestions([]);
      setAnswers({});

      // Reload tests and attempts
      await loadOnlineTests();
      await loadPaperSets();

    } catch (error) {
      console.error('❌ Failed to submit test:', error);
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || 'Failed to submit test. Please try again.';
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevious = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentVideoIndex < filteredVideos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const currentVideo = filteredVideos[currentVideoIndex];
  const userData = getUserData();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-8 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center">
            <span className="mr-3">🎓</span>
            Student Learning Portal
          </h1>
          <p className="text-blue-100 text-lg">
            {dashboardData?.data?.student?.course || selectedCourse !== 'All Courses' ? selectedCourse : 'All Courses'} — {dashboardData?.data?.student?.name || userData?.name || 'Student'}
          </p>
          {programs.length > 0 && (
            <p className="text-blue-200 text-sm mt-1">
              {programs.length} Programs • {courses.length} Courses • {subjects.length} Subjects Available
            </p>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Tests</p>
                <p className="text-2xl font-bold text-gray-800">{allTests.length || dashboardData.data.statistics.total_tests || 0}</p>
              </div>
              <div className="text-4xl">📝</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Available Tests</p>
                <p className="text-2xl font-bold text-gray-800">{allTests.filter(t => t.status === 'active' || !t.status).length || dashboardData.data.statistics.available_tests || 0}</p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Enrolled Courses</p>
                <p className="text-2xl font-bold text-gray-800">{courses.length}</p>
              </div>
              <div className="text-4xl">📚</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Study Materials</p>
                <p className="text-2xl font-bold text-gray-800">{studyMaterials.length}</p>
              </div>
              <div className="text-4xl">📖</div>
            </div>
          </div>
        </div>
      )}

      {/* Courses Section */}
      {courses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📚</span>
            My Enrolled Courses
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <div key={course.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h4 className="font-semibold text-gray-800 mb-2">{course.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{course.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {course.status}
                  </span>
                  <span className="text-sm text-gray-500">{course.progress}% Complete</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Online Tests Section */}
      {allTests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📝</span>
            Available Online Tests & Assessments
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allTests.map((test) => {
              const attempt = testAttempts.find(a => a.quiz_id === test.id);
              const isAttempted = !!attempt;

              return (
                <div key={test.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{test.title}</h4>
                      {test.type && (
                        <span className="text-xs text-gray-500 mt-1">
                          {test.type === 'paper_set' ? '📄 Paper Set' : '📝 Quiz'}
                        </span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${isAttempted ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                      {isAttempted ? 'Completed' : 'Available'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{test.description}</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Questions:</span> {test.total_questions}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Time:</span> {test.time_limit} mins
                    </div>
                  </div>
                  {isAttempted ? (
                    <div className="bg-orange-50 p-3 rounded">
                      <p className="text-sm text-orange-700">
                        Score: <span className="font-bold">{attempt.score}</span>
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        Completed on {new Date(attempt.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartTest(test)}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors"
                    >
                      Start Test
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">🔍 Filter Your Content</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Program Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Program</label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            >
              <option value="All Programs">— All Programs —</option>
              {programs.map((program) => (
                <option key={program.id || program._id} value={program.program_name}>
                  {program.program_name}
                </option>
              ))}
            </select>
          </div>

          {/* Course Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            >
              <option value="All Courses">— All Courses —</option>
              {courses.map((course) => (
                <option key={course.id || course._id} value={course.course_name || course.title}>
                  {course.course_name || course.title}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            >
              <option value="All Subjects">— All Subjects —</option>
              {subjects.map((subject, index) => (
                <option key={index} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {filteredVideos.length} of {videos.length} videos
          </p>
          {(selectedProgram !== 'All Programs' || selectedCourse !== 'All Courses' || selectedSubject !== 'All Subjects' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedProgram('All Programs');
                setSelectedCourse('All Courses');
                setSelectedSubject('All Subjects');
                setSearchQuery('');
              }}
              className="text-blue-500 hover:text-blue-600 text-sm font-medium"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Video Player Section */}
      {filteredVideos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🎥</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Videos Available</h3>
            <p className="text-gray-600">Videos will appear here once uploaded by your instructor.</p>
          </div>

          {/* Debug Info */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
            <p className="text-sm font-bold text-yellow-800 mb-2">🔍 Debug Information:</p>
            <div className="text-xs text-yellow-700 space-y-1">
              <p><strong>Total Videos Loaded:</strong> {videos.length}</p>
              <p><strong>Filtered Videos:</strong> {filteredVideos.length}</p>
              <p><strong>Selected Program:</strong> {selectedProgram}</p>
              <p><strong>Selected Course:</strong> {selectedCourse}</p>
              <p><strong>Selected Subject:</strong> {selectedSubject}</p>
              <p><strong>Search Query:</strong> {searchQuery || 'None'}</p>
              {videos.length > 0 && (
                <>
                  <p className="mt-2"><strong>First Video Data:</strong></p>
                  <pre className="bg-white p-2 rounded mt-1 overflow-auto max-h-40 text-xs">
                    {JSON.stringify(videos[0], null, 2)}
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Course and Subject Info */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="text-center text-sm text-gray-700">
              <span className="font-medium">Course:</span> {currentVideo?.course || dashboardData?.data?.student?.course || 'N/A'}
              <span className="mx-4">|</span>
              <span className="font-medium">Subject:</span> {currentVideo?.subject || 'General'}
              <span className="mx-4">#{currentVideoIndex + 1}/{filteredVideos.length}</span>
            </div>
          </div>

          {/* Video Player */}
          <div className="relative bg-black" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={currentVideo?.video_url || currentVideo?.url || 'https://www.youtube.com/embed/dQw4w9WgXcQ'}
              title={currentVideo?.title || 'Video Class'}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>

          {/* Video Controls */}
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">{currentVideo?.title}</h3>
            <p className="text-gray-600 mb-4">{currentVideo?.description}</p>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {currentVideo?.instructor && (
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                    👨‍🏫 {currentVideo.instructor}
                  </span>
                )}
                {currentVideo?.duration && (
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    ⏱️ {currentVideo.duration}
                  </span>
                )}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handlePrevious}
                disabled={currentVideoIndex === 0}
                className="bg-cyan-400 hover:bg-cyan-500 text-white font-semibold px-6 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⬅ Previous
              </button>
              <button
                onClick={handleNext}
                disabled={currentVideoIndex === filteredVideos.length - 1}
                className="bg-cyan-400 hover:bg-cyan-500 text-white font-semibold px-6 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next ➡
              </button>
            </div>

            {/* Video Counter */}
            <div className="text-center mt-4 text-sm text-gray-600">
              Video {currentVideoIndex + 1} of {filteredVideos.length}
            </div>
          </div>
        </div>
      )}

      {/* Study Materials Section */}
      {studyMaterials.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📖</span>
            Study Materials
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {studyMaterials.slice(0, 6).map((material) => (
              <div key={material.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-800 text-sm flex-1">{material.title}</h4>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    {material.type || 'PDF'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-3">{material.description}</p>
                <a
                  href={material.file_url || material.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                >
                  Download / View →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Modal */}
      {showTestModal && selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-blue-600 text-white p-6 rounded-t-xl">
              <h2 className="text-2xl font-bold mb-2">{selectedTest.title}</h2>
              <div className="flex items-center justify-between text-sm">
                <span>Question {currentQuestion + 1} of {testQuestions.length}</span>
                <span>Time Limit: {selectedTest.time_limit} minutes</span>
              </div>
            </div>

            {/* Question Content */}
            <div className="p-6">
              {testQuestions.length > 0 && testQuestions[currentQuestion] && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-lg font-semibold text-gray-800 mb-4">
                      {testQuestions[currentQuestion].question_text || testQuestions[currentQuestion].text}
                    </p>
                  </div>

                  {/* Answer Options */}
                  <div className="space-y-3">
                    {(testQuestions[currentQuestion].options || []).map((option, index) => (
                      <label
                        key={index}
                        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${answers[testQuestions[currentQuestion].id] === option
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                          }`}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion}`}
                          value={option}
                          checked={answers[testQuestions[currentQuestion].id] === option}
                          onChange={() => handleAnswerSelect(testQuestions[currentQuestion].id, option)}
                          className="mr-3 h-4 w-4"
                        />
                        <span className="text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <button
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ⬅ Previous
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowTestModal(false);
                      setSelectedTest(null);
                      setTestQuestions([]);
                      setAnswers({});
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg"
                  >
                    Cancel
                  </button>

                  {currentQuestion === testQuestions.length - 1 ? (
                    <button
                      onClick={handleSubmitTest}
                      disabled={isSubmitting}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Test'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentQuestion(Math.min(testQuestions.length - 1, currentQuestion + 1))}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
                    >
                      Next ➡
                    </button>
                  )}
                </div>
              </div>

              {/* Answer Progress */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Answered: {Object.keys(answers).length} / {testQuestions.length}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {testQuestions.map((q, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestion(index)}
                      className={`w-8 h-8 rounded text-sm font-medium ${answers[q.id]
                        ? 'bg-orange-500 text-white'
                        : index === currentQuestion
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700'
                        }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
    </div>
  );
};

export default StudentVideoClasses;
