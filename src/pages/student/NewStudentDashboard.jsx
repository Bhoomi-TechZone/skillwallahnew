import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getUserData } from '../../utils/authUtils';
import { logout } from '../../utils/enhancedAuthUtils';
import branchStudentDashboardService from '../../services/branchStudentDashboardService';
import StudentProfile from './StudentProfile';
import StudentStudyMaterial from './StudentStudyMaterial';
import StudentVideoClasses from './StudentVideoClasses';
import StudentOnlineTest from './StudentOnlineTest';
import StudentResults from './StudentResults';
import StudentTestAttempt from './StudentTestAttempt';
import MyEnrollCourse from './MyEnrollCourse';

const API_BASE_URL = 'http://localhost:4000';

// Helper function to download file properly
const downloadFile = async (fileUrl, fileName) => {
  try {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

    // Make URL absolute if relative
    let absoluteUrl = fileUrl;
    if (fileUrl && !fileUrl.startsWith('http')) {
      absoluteUrl = `${API_BASE_URL}/${fileUrl.replace(/^\//, '')}`;
    }

    console.log('Downloading from:', absoluteUrl);

    // Fetch the file as blob
    const response = await fetch(absoluteUrl, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });

    if (!response.ok) {
      throw new Error('Failed to fetch file');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    window.URL.revokeObjectURL(url);

    console.log('✅ Download completed');
  } catch (error) {
    console.error('Download failed:', error);
    // Fallback: open in new tab
    let absoluteUrl = fileUrl;
    if (fileUrl && !fileUrl.startsWith('http')) {
      absoluteUrl = `${API_BASE_URL}/${fileUrl.replace(/^\//, '')}`;
    }
    window.open(absoluteUrl, '_blank');
  }
};

const NewStudentDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMenuItem, setActiveMenuItem] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTestId, setActiveTestId] = useState(null);
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [userData, setUserData] = useState(null);
  const [showIdCard, setShowIdCard] = useState(false);
  const [questionPapers, setQuestionPapers] = useState([]);
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [dynamicStats, setDynamicStats] = useState({
    totalQuestions: 0,
    totalMaterials: 0,
    totalTests: 0,
    completedTests: 0,
    availableTests: 0,
    pendingTests: 0
  });

  useEffect(() => {
    const loadAllData = async () => {
      await loadStudentData();
      await loadQuestionPapers();
      await loadStudyMaterials();
      // Update final stats after all data is loaded
      updateFinalStats();
    };

    loadAllData();
  }, []);

  // Fetch additional branch student profile if branch is missing
  useEffect(() => {
    const fetchBranchProfile = async () => {
      if (studentData && (!studentData.course?.branch || studentData.course?.branch === 'N/A')) {
        try {
          const token = localStorage.getItem('access_token');
          if (!token) return;

          const profileResponse = await axios.get(`${API_BASE_URL}/api/branch-students/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (profileResponse.data && profileResponse.data.profile) {
            const profile = profileResponse.data.profile;
            setStudentData(prev => ({
              ...prev,
              course: {
                ...prev.course,
                branch: profile.branch || profile.branch_code || userData?.branch_code || 'N/A'
              }
            }));
          }
        } catch (error) {
          console.log('Could not fetch additional branch profile:', error);
        }
      }
    };

    fetchBranchProfile();
  }, [studentData?.course?.branch, userData?.branch_code]);

  // Check if accessed via test-result route and set active menu to Results
  useEffect(() => {
    if (location.pathname.includes('/student/test-result/')) {
      setActiveMenuItem('Results');
    }
  }, [location.pathname]);

  // Reset showIdCard when switching away from Profile
  useEffect(() => {
    if (activeMenuItem !== 'Profile') {
      setShowIdCard(false);
    }
  }, [activeMenuItem]);

  const updateFinalStats = () => {
    console.log('🔄 Updating final stats...');
    console.log('Question papers:', questionPapers.length);
    console.log('Study materials:', studyMaterials.length);

    // Calculate total questions from all papers
    const totalQuestions = questionPapers.reduce((total, paper) => {
      const questionCount = paper.questions ? paper.questions.length : 0;
      console.log(`Paper: ${paper.subject || paper.name}, Questions: ${questionCount}`);
      return total + questionCount;
    }, 0);

    // Calculate available tests (papers that can be attempted)
    const availableTests = questionPapers.filter(paper =>
      paper.status === 'Waiting' || paper.status === 'Active' || !paper.status
    ).length;

    const totalMaterials = studyMaterials.length;

    console.log('Calculated Stats:', {
      totalQuestions,
      availableTests,
      totalMaterials,
      paperCount: questionPapers.length
    });

    // Update dynamic stats state
    setDynamicStats({
      totalQuestions,
      availableTests,
      totalMaterials
    });

    // Also update studentData if it exists
    if (studentData) {
      const updatedStats = {
        ...studentData.stats,
        totalQuestions,
        totalMaterials,
        totalTests: questionPapers.length,
        availableTests
      };

      setStudentData(prev => ({
        ...prev,
        stats: updatedStats
      }));

      console.log('✅ Stats updated in both states:', updatedStats);
    }
  };

  // Update stats whenever dynamic data changes
  useEffect(() => {
    if (studentData && (questionPapers.length > 0 || studyMaterials.length > 0)) {
      // Recalculate dynamic progress based on completed tests
      const totalTests = questionPapers.length || studentData.stats?.totalTests || 0;
      const completedTests = studentData.stats?.completedTests || 0;
      const newProgressPercentage = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : studentData.stats?.progressPercentage || 0;

      const updatedStats = {
        ...studentData.stats,
        totalQuestions: dynamicStats.totalQuestions || questionPapers.reduce((total, paper) => total + (paper.totalQuestions || 0), 0),
        totalMaterials: studyMaterials.length || dynamicStats.totalMaterials,
        totalTests: totalTests,
        availableTests: questionPapers.filter(p => p.status === 'Waiting').length || dynamicStats.availableTests,
        progressPercentage: newProgressPercentage
      };

      setStudentData(prev => ({
        ...prev,
        stats: updatedStats
      }));

      console.log('✅ Stats updated:', updatedStats);
    }
  }, [questionPapers, studyMaterials, studentData?.stats?.completedTests]);

  const loadQuestionPapers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      console.log('🔍 Fetching question papers from API...');
      const response = await axios.get(`${API_BASE_URL}/api/questions/?page=1&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      });

      if (response.data) {
        const questions = Array.isArray(response.data) ? response.data :
          (response.data.questions || response.data.data || []);

        // Group questions by subject/category to create question papers
        const paperGroups = {};
        questions.forEach(question => {
          const subject = question.subject || question.category || 'General';
          const difficulty = question.difficulty || 'Medium';
          const paperKey = `${subject} - ${difficulty}`;

          if (!paperGroups[paperKey]) {
            paperGroups[paperKey] = {
              id: `paper_${Object.keys(paperGroups).length + 1}`,
              name: paperKey,
              subject: subject,
              difficulty: difficulty,
              questions: [],
              totalQuestions: 0,
              duration: 60, // Default duration
              marks: 0,
              status: 'Waiting',
              courseCategory: subject,
              courseName: subject
            };
          }

          paperGroups[paperKey].questions.push(question);
          paperGroups[paperKey].totalQuestions++;
          paperGroups[paperKey].marks += question.marks || 1;
        });

        const papers = Object.values(paperGroups);
        setQuestionPapers(papers);
        console.log('✅ Loaded question papers:', papers);

        // Update dynamic stats with actual counts
        const totalQuestions = questions.length;
        const availableTests = papers.filter(p => p.status === 'Waiting').length;

        setDynamicStats(prev => ({
          ...prev,
          totalQuestions: totalQuestions,
          totalTests: papers.length,
          availableTests: availableTests
        }));

        console.log(`📊 Updated stats - Questions: ${totalQuestions}, Papers: ${papers.length}, Available: ${availableTests}`);
      }
    } catch (error) {
      console.error('❌ Error loading question papers:', error);
    }
  };

  const loadStudyMaterials = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      console.log('📚 Fetching study materials from API...');
      const response = await axios.get(`${API_BASE_URL}/api/branch-study-materials/materials`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      });

      if (response.data) {
        const materials = Array.isArray(response.data) ? response.data :
          (response.data.materials || response.data.data || []);

        // Transform materials to match expected format
        const transformedMaterials = materials.map((material, index) => ({
          id: material.id || material._id || index + 1,
          title: material.title || material.name || 'Study Material',
          type: material.type || 'pdf',
          fileUrl: material.file_url || material.fileUrl || material.url,
          externalLink: material.external_link || material.externalLink,
          description: material.description || `Program: ${material.program || 'N/A'}, Course: ${material.course || 'N/A'}, Subject: ${material.subject || 'N/A'}`,
          uploadedAt: material.uploaded_at || material.createdAt || new Date().toISOString(),
          program: material.program,
          course: material.course,
          subject: material.subject,
          status: material.status || 'active'
        }));

        setStudyMaterials(transformedMaterials);
        console.log('✅ Loaded study materials:', transformedMaterials);

        // Update dynamic stats
        setDynamicStats(prev => ({
          ...prev,
          totalMaterials: transformedMaterials.length
        }));

        console.log(`📚 Updated materials count: ${transformedMaterials.length}`);
      }
    } catch (error) {
      console.error('❌ Error loading study materials:', error);
    }
  };

  const loadStudentData = async () => {
    try {
      setLoading(true);

      const user = getUserData();
      console.log('👤 [Dashboard] User data:', user);

      if (!user) {
        navigate('/student/login');
        return;
      }

      setUserData(user);

      const isBranchStudent = user.role === 'student' || user.is_branch_student === true;

      if (!isBranchStudent) {
        navigate('/');
        return;
      }

      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/student/login');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/api/branch-students/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ [Dashboard] Response:', response.data);

      const { student = {}, course_info = {}, statistics = {}, tests = [], study_materials = [] } = response.data;

      // Calculate dynamic progress and test completion
      const totalTests = questionPapers.length || statistics.total_tests || 0;
      const completedTests = statistics.completed_tests || 0;
      const progressPercentage = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : statistics.progress_percentage || 0;

      // Update final stats combining API data and dynamic data
      const finalStats = {
        totalTests: totalTests,
        availableTests: dynamicStats.availableTests || statistics.available_tests || 0,
        completedTests: completedTests,
        pendingTests: totalTests - completedTests,
        progressPercentage: progressPercentage,
        totalFee: statistics.total_fee || 0,
        netFee: statistics.net_fee || 0,
        paidAmount: statistics.paid_amount || 0,
        dueAmount: statistics.due_amount || 0,
        totalQuestions: dynamicStats.totalQuestions || 0,
        totalMaterials: dynamicStats.totalMaterials || 0
      };

      // Transform backend data
      const dashboardData = {
        // Student Info
        student: {
          id: student.id,
          name: student.name || user.name || 'Student',
          email: student.email || user.email,
          registrationNumber: student.registration_number || user.student_id,
          photo: student.photo,
          contact: student.contact || user.phone
        },

        // Course Info with proper branch handling
        course: {
          name: student.course || course_info.course_name || user.course || 'No Course',
          code: course_info.course_code,
          duration: course_info.duration,
          description: course_info.description,
          batch: student.batch || user.batch,
          admissionDate: student.admission_date || user.created_at,
          branch: student.branch || user.branch_code || user.branch || course_info.branch || 'N/A'
        },

        // Tests - Use dynamic question papers if available
        tests: questionPapers.length > 0 ? questionPapers : tests.map(test => ({
          id: test.id,
          name: test.name,
          questions: test.questions || 0,
          duration: test.duration || 0,
          marks: test.marks || 0,
          status: test.status || 'Waiting',
          availableFrom: test.availableFrom,
          availableTo: test.availableTo,
          courseCategory: test.courseCategory,
          courseName: test.courseName
        })),

        // Study Materials - Use dynamic materials if available
        materials: studyMaterials.length > 0 ? studyMaterials : study_materials.map(mat => ({
          id: mat.id,
          title: mat.title,
          type: mat.type,
          fileUrl: mat.file_url,
          externalLink: mat.external_link,
          description: mat.description,
          uploadedAt: mat.uploaded_at
        })),

        // Statistics - Use combined dynamic stats
        stats: finalStats
      };

      setStudentData(dashboardData);
      setLoading(false);

    } catch (error) {
      console.error('❌ [Dashboard] Error:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        navigate('/student/login');
      }
      setLoading(false);
      setStudentData(null);
    }
  };

  const menuItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'Profile', label: 'Profile', icon: '👤' },
    { id: 'MyCourses', label: 'My Courses', icon: '🎓' },
    { id: 'StudyMaterial', label: 'Study Material', icon: '📚' },
    { id: 'VideoClasses', label: 'Video Classes', icon: '🎥' },
    { id: 'OnlineTest', label: 'Online Test', icon: '📝' },
    { id: 'Results', label: 'Result / Certi / Marksheet', icon: '🎖️' }
  ];

  const handleLogout = () => {
    try {
      logout();
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const filteredTests = studentData?.tests?.filter(test =>
    test.name.toLowerCase().includes(testSearchQuery.toLowerCase())
  ) || [];

  const filteredMaterials = studyMaterials.filter(material =>
    material.title.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
    material.subject?.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
    material.course?.toLowerCase().includes(testSearchQuery.toLowerCase())
  );

  const startTest = (testId, testName) => {
    console.log(`🚀 Starting test: ${testName} (ID: ${testId})`);
    setActiveTestId(testId);
    setActiveMenuItem('TestAttempt');
  };

  const viewQuestionPaper = (paperId, paperName) => {
    console.log(`👁️ Viewing question paper: ${paperName} (ID: ${paperId})`);
    // Navigate to questions view or show modal
    navigate(`/questions/${paperId}`, { state: { paperName } });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-teal-600 to-teal-700 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out z-50 flex flex-col shadow-2xl`}>
        {/* Sidebar Header */}
        <div className="p-4 bg-teal-800/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">

            <span className="text-white font-semibold text-sm">Student Portal</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveMenuItem(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-all ${activeMenuItem === item.id
                ? 'bg-white text-teal-700 shadow-lg font-semibold'
                : 'text-white hover:bg-teal-500/30'
                }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="px-3 pb-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 rounded-lg text-left transition-all text-white hover:bg-red-500/30 border border-red-400/50"
          >
            <span className="mr-3 text-lg">🚪</span>
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>

        {/* Due Amount Section */}
        <div className="p-4 bg-teal-800/50 border-t border-teal-500/30">
          <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
            <div className="flex items-center space-x-2">
              <span className="text-teal-600">💰</span>
              <span className="text-sm font-medium text-gray-700">Due Amount</span>
            </div>
            <span className="text-teal-700 font-bold text-lg">₹{studentData?.stats?.dueAmount || 0}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Header */}
        <div className="bg-white shadow-md sticky top-0 z-30 border-b border-gray-200">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                  Welcome, {studentData?.student?.name?.split(' ')[0] || 'Student'} 👋
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {studentData?.course?.name || 'No Course'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Removed logout button - now in sidebar */}
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {activeMenuItem === 'Profile' ? (
            <StudentProfile
              showIdCard={showIdCard}
              onIdCardViewed={() => setShowIdCard(false)}
              studentData={studentData}
            />
          ) : activeMenuItem === 'MyCourses' ? (
            <MyEnrollCourse />
          ) : activeMenuItem === 'StudyMaterial' ? (
            <StudentStudyMaterial />
          ) : activeMenuItem === 'VideoClasses' ? (
            <StudentVideoClasses />
          ) : activeMenuItem === 'OnlineTest' ? (
            <StudentOnlineTest onStartTest={(testId) => {
              setActiveTestId(testId);
              setActiveMenuItem('TestAttempt');
            }} onViewResult={(resultId) => {
              setActiveMenuItem('Results');
            }} />
          ) : activeMenuItem === 'TestAttempt' && activeTestId ? (
            <StudentTestAttempt testId={activeTestId} onBack={() => setActiveMenuItem('OnlineTest')} />
          ) : activeMenuItem === 'Results' ? (
            <StudentResults />
          ) : activeMenuItem === 'Dashboard' ? (
            <>
              {/* Student Info Card */}
              <div className="bg-gradient-to-br from-teal-50 via-white to-blue-50 rounded-2xl shadow-lg p-6 border border-teal-100">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="relative">
                      <img
                        src={studentData?.student?.photo || 'https://ui-avatars.com/api/?name=' + (studentData?.student?.name || 'Student')}
                        alt="Profile"
                        className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-1">
                        {studentData?.student?.name || 'Student'}
                      </h2>
                      <p className="text-gray-600 text-sm flex items-center gap-2">
                        <span className="font-semibold text-teal-600">📚 {studentData?.course?.name || 'N/A'}</span>
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        Reg No: <span className="font-medium">{studentData?.student?.registrationNumber || 'N/A'}</span>
                        {studentData?.course?.batch && <span className="ml-3">Batch: <span className="font-medium">{studentData?.course?.batch}</span></span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="relative w-24 h-24">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="48"
                            cy="48"
                            r="42"
                            stroke="#e5e7eb"
                            strokeWidth="8"
                            fill="transparent"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r="42"
                            stroke="#14b8a6"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={`${(studentData?.stats?.progressPercentage || 0) * 2.64} 264`}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold text-gray-800">{studentData?.stats?.progressPercentage || 0}%</span>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-gray-600 mt-2">Progress</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">📅</span>
                    <div>
                      <p className="text-xs text-gray-500">Admission</p>
                      <p className="font-medium text-gray-700">{studentData?.course?.admissionDate ? new Date(studentData.course.admissionDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">🏢</span>
                    <div>
                      <p className="text-xs text-gray-500">Branch</p>
                      <p className="font-medium text-gray-700">{studentData?.course?.branch || userData?.branch_code || userData?.branch || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">⏱️</span>
                    <div>
                      <p className="text-xs text-gray-500">Duration</p>
                      <p className="font-medium text-gray-700">{studentData?.course?.duration || 'N/A'} months</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500">✅</span>
                    <div>
                      <p className="text-xs text-gray-500">Tests Done</p>
                      <p className="font-medium text-gray-700">{studentData?.stats?.completedTests || 0}/{studentData?.stats?.totalTests || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics Cards - Now Dynamic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Question Papers */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden transform hover:scale-105 transition-transform">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-4xl font-bold">{dynamicStats.totalQuestions || studentData?.stats?.totalQuestions || 0}</h3>
                      <span className="text-4xl opacity-50">❓</span>
                    </div>
                    <p className="text-sm font-semibold">Total Questions</p>
                    <p className="text-xs opacity-75 mt-1">{questionPapers.length || studentData?.stats?.totalTests || 0} Question Papers</p>
                  </div>
                </div>

                {/* Study Materials */}
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden transform hover:scale-105 transition-transform">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-4xl font-bold">{studyMaterials.length || dynamicStats.totalMaterials || 0}</h3>
                      <span className="text-4xl opacity-50">📚</span>
                    </div>
                    <p className="text-sm font-semibold">Study Materials</p>
                    <p className="text-xs opacity-75 mt-1">Available Resources</p>
                  </div>
                </div>

                {/* Available Tests */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden transform hover:scale-105 transition-transform">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-4xl font-bold">{dynamicStats.availableTests || questionPapers.filter(p => p.status === 'Waiting').length}</h3>
                      <span className="text-4xl opacity-50">✅</span>
                    </div>
                    <p className="text-sm font-semibold">Available Tests</p>
                    <p className="text-xs opacity-75 mt-1">Ready to Attempt</p>
                  </div>
                </div>

                {/* Due Amount */}
                <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden transform hover:scale-105 transition-transform">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-3xl font-bold">₹{studentData?.stats?.dueAmount || 0}</h3>
                      <span className="text-4xl opacity-50">💰</span>
                    </div>
                    <p className="text-sm font-semibold">Due Amount</p>
                    <p className="text-xs opacity-75 mt-1">Pending Payment</p>
                  </div>
                </div>
              </div>

              {/* Course Information Section */}
              {studentData?.course && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                    <h3 className="text-lg font-bold flex items-center">
                      <span className="mr-2">🎓</span>
                      Course Information
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-100">
                        <p className="text-xs text-gray-500 mb-1">Course Name</p>
                        <p className="font-bold text-gray-800">{studentData.course.name}</p>
                      </div>
                      {studentData.course.code && (
                        <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg border border-purple-100">
                          <p className="text-xs text-gray-500 mb-1">Course Code</p>
                          <p className="font-bold text-gray-800">{studentData.course.code}</p>
                        </div>
                      )}
                      {studentData.course.duration && (
                        <div className="bg-gradient-to-br from-orange-50 to-white p-4 rounded-lg border border-orange-100">
                          <p className="text-xs text-gray-500 mb-1">Duration</p>
                          <p className="font-bold text-gray-800">{studentData.course.duration}</p>
                        </div>
                      )}
                      {studentData.course.batch && (
                        <div className="bg-gradient-to-br from-yellow-50 to-white p-4 rounded-lg border border-yellow-100">
                          <p className="text-xs text-gray-500 mb-1">Batch</p>
                          <p className="font-bold text-gray-800">{studentData.course.batch}</p>
                        </div>
                      )}
                      {studentData.course.admissionDate && (
                        <div className="bg-gradient-to-br from-teal-50 to-white p-4 rounded-lg border border-teal-100">
                          <p className="text-xs text-gray-500 mb-1">Admission Date</p>
                          <p className="font-bold text-gray-800">{new Date(studentData.course.admissionDate).toLocaleDateString()}</p>
                        </div>
                      )}
                      {studentData.course.branch && (
                        <div className="bg-gradient-to-br from-pink-50 to-white p-4 rounded-lg border border-pink-100">
                          <p className="text-xs text-gray-500 mb-1">Branch</p>
                          <p className="font-bold text-gray-800">{studentData.course.branch}</p>
                        </div>
                      )}
                    </div>
                    {studentData.course.description && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{studentData.course.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tests/Papers Section - Now Dynamic */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 text-white">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold flex items-center">
                        <span className="mr-2">📝</span>
                        Question Papers & Tests
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                          {questionPapers.length} Papers
                        </span>
                        <button
                          onClick={() => {
                            loadQuestionPapers();
                            loadStudyMaterials();
                          }}
                          className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm transition-colors"
                        >
                          🔄 Refresh
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="🔍 Search question papers, tests, materials..."
                        value={testSearchQuery}
                        onChange={(e) => setTestSearchQuery(e.target.value)}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {questionPapers && questionPapers.length > 0 ? (
                        questionPapers
                          .filter(paper => paper.name.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
                            paper.subject.toLowerCase().includes(testSearchQuery.toLowerCase()))
                          .map((paper) => (
                            <div key={paper.id} className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border-2 border-gray-100 hover:border-teal-300 hover:shadow-md transition-all">
                              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                                <div className="flex-1 w-full">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="text-2xl">📄</span>
                                    <h4 className="font-bold text-gray-800 text-base">{paper.name}</h4>
                                  </div>
                                  <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-2">
                                    <div className="flex items-center bg-blue-50 px-2 py-1 rounded">
                                      <span className="mr-1">❓</span>
                                      <span className="font-medium">{paper.totalQuestions} Questions</span>
                                    </div>
                                    <div className="flex items-center bg-purple-50 px-2 py-1 rounded">
                                      <span className="mr-1">⏱️</span>
                                      <span className="font-medium">{paper.duration} Min</span>
                                    </div>
                                    <div className="flex items-center bg-orange-50 px-2 py-1 rounded">
                                      <span className="mr-1">🎯</span>
                                      <span className="font-medium">{paper.marks} Marks</span>
                                    </div>
                                    <div className="flex items-center bg-orange-50 px-2 py-1 rounded">
                                      <span className="mr-1">📊</span>
                                      <span className="font-medium">{paper.difficulty}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                                    <span className="bg-teal-50 text-teal-700 px-2 py-1 rounded">
                                      Subject: {paper.subject}
                                    </span>
                                    {paper.courseCategory && (
                                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                        Category: {paper.courseCategory}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="ml-0 sm:ml-4 flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                                  <button
                                    onClick={() => startTest(paper.id, paper.name)}
                                    className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold bg-teal-500 hover:bg-teal-600 text-white shadow-md transition-colors"
                                  >
                                    <span className="mr-2">▶️</span>
                                    Start Test
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                      ) : filteredTests && filteredTests.length > 0 ? (
                        filteredTests.map((test) => (
                          <div key={test.id} className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border-2 border-gray-100 hover:border-teal-300 hover:shadow-md transition-all">
                            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                              <div className="flex-1 w-full">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="text-2xl">📄</span>
                                  <h4 className="font-bold text-gray-800 text-base">{test.name}</h4>
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-2">
                                  <div className="flex items-center bg-blue-50 px-2 py-1 rounded">
                                    <span className="mr-1">❓</span>
                                    <span className="font-medium">{test.questions} Questions</span>
                                  </div>
                                  <div className="flex items-center bg-purple-50 px-2 py-1 rounded">
                                    <span className="mr-1">⏱️</span>
                                    <span className="font-medium">{test.duration} Min</span>
                                  </div>
                                  {test.marks > 0 && (
                                    <div className="flex items-center bg-orange-50 px-2 py-1 rounded">
                                      <span className="mr-1">🎯</span>
                                      <span className="font-medium">{test.marks} Marks</span>
                                    </div>
                                  )}
                                </div>
                                {test.courseCategory && (
                                  <p className="text-xs text-gray-500 mb-1">
                                    <span className="font-medium">Category:</span> {test.courseCategory}
                                  </p>
                                )}
                                {test.courseName && (
                                  <p className="text-xs text-gray-500 mb-1">
                                    <span className="font-medium">Course:</span> {test.courseName}
                                  </p>
                                )}
                              </div>
                              <div className="ml-0 sm:ml-4 flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                                {test.status === 'Complete' ? (
                                  <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold bg-orange-500 text-white shadow-md">
                                    <span className="mr-2">✅</span>
                                    Completed
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => startTest(test.id, test.name)}
                                    className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold bg-teal-500 hover:bg-teal-600 text-white shadow-md transition-colors"
                                  >
                                    <span className="mr-2">▶️</span>
                                    Start Test
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-5xl mb-3">📝</div>
                          <p className="font-medium">No question papers or tests available</p>
                          <p className="text-sm text-gray-400 mt-1">
                            {testSearchQuery ? 'Try adjusting your search term' : 'Question papers will appear here once loaded'}
                          </p>
                          <button
                            onClick={loadQuestionPapers}
                            className="mt-4 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            🔄 Reload Question Papers
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Study Materials Section - Now Dynamic */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold flex items-center">
                        <span className="mr-2">📚</span>
                        Study Materials
                      </h3>
                      <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                        {studyMaterials.length} Materials
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {filteredMaterials && filteredMaterials.length > 0 ? (
                        filteredMaterials.map((material) => (
                          <div key={material.id} className="bg-gradient-to-r from-purple-50 to-white rounded-lg p-3 border border-purple-100 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-lg">
                                    {material.type === 'video' ? '🎥' :
                                      material.type === 'pdf' ? '📄' :
                                        material.type === 'link' ? '🔗' :
                                          material.type === 'doc' ? '📝' :
                                            material.type === 'ppt' ? '📊' : '📎'}
                                  </span>
                                  <h4 className="font-semibold text-gray-800 text-sm line-clamp-1">{material.title}</h4>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {material.program && (
                                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                                      📚 {material.program}
                                    </span>
                                  )}
                                  {material.course && (
                                    <span className="bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded">
                                      🎓 {material.course}
                                    </span>
                                  )}
                                  {material.subject && (
                                    <span className="bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded">
                                      📖 {material.subject}
                                    </span>
                                  )}
                                </div>
                                {material.description && (
                                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{material.description}</p>
                                )}
                                {material.uploadedAt && (
                                  <p className="text-xs text-gray-400">
                                    📅 {new Date(material.uploadedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex gap-2">
                              {material.fileUrl && (
                                <button
                                  onClick={() => downloadFile(material.fileUrl, material.title || 'study-material')}
                                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
                                >
                                  <span className="mr-1">⬇️</span>
                                  Download
                                </button>
                              )}
                              {material.externalLink && (
                                <button
                                  onClick={() => window.open(material.externalLink, '_blank')}
                                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
                                >
                                  <span className="mr-1">🔗</span>
                                  Open Link
                                </button>
                              )}
                              {!material.fileUrl && !material.externalLink && (
                                <button
                                  onClick={() => alert('Material content not available')}
                                  className="flex-1 bg-gray-400 text-white text-xs font-semibold py-2 px-3 rounded-lg cursor-not-allowed flex items-center justify-center"
                                >
                                  <span className="mr-1">❌</span>
                                  Not Available
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : studyMaterials && studyMaterials.length > 0 ? (
                        studyMaterials.map((material) => (
                          <div key={material.id} className="bg-gradient-to-r from-purple-50 to-white rounded-lg p-3 border border-purple-100 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-lg">📚</span>
                                  <h4 className="font-semibold text-gray-800 text-sm line-clamp-1">{material.title}</h4>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {material.program && (
                                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                                      📚 {material.program}
                                    </span>
                                  )}
                                  {material.course && (
                                    <span className="bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded">
                                      🎓 {material.course}
                                    </span>
                                  )}
                                  {material.subject && (
                                    <span className="bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded">
                                      📖 {material.subject}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2 mb-2">{material.description}</p>
                                {material.uploadedAt && (
                                  <p className="text-xs text-gray-400">
                                    📅 {new Date(material.uploadedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex gap-2">
                              {material.fileUrl && (
                                <button
                                  onClick={() => downloadFile(material.fileUrl, material.title || 'study-material')}
                                  className="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
                                >
                                  <span className="mr-1">⬇️</span>
                                  Download
                                </button>
                              )}
                              {material.externalLink && (
                                <button
                                  onClick={() => window.open(material.externalLink, '_blank')}
                                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
                                >
                                  <span className="mr-1">🔗</span>
                                  Open Link
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-5xl mb-3">📚</div>
                          <p className="font-medium">No study materials available</p>
                          <p className="text-sm text-gray-400 mt-1">
                            {testSearchQuery ? 'Try adjusting your search term' : 'Study materials will appear here once uploaded'}
                          </p>
                          <button
                            onClick={loadStudyMaterials}
                            className="mt-4 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            🔄 Reload Materials
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setActiveMenuItem('StudyMaterial')}
                      className="w-full mt-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all shadow-md"
                    >
                      View All Materials →
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-700 to-gray-800 p-4 text-white">
                  <h3 className="text-lg font-bold flex items-center">
                    <span className="mr-2">⚡</span>
                    Quick Actions
                  </h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        setShowIdCard(false);
                        setActiveMenuItem('Profile');
                      }}
                      className="bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-2 border-blue-200 rounded-xl p-4 transition-all transform hover:scale-105 group"
                    >
                      <div className="text-3xl mb-2">👤</div>
                      <p className="text-sm font-bold text-gray-800">My Profile</p>
                    </button>

                    {/* ID Card Button - Quick Access */}
                    <button
                      onClick={() => {
                        setShowIdCard(true);
                        setActiveMenuItem('Profile');
                      }}
                      className="bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 border-2 border-indigo-200 rounded-xl p-4 transition-all transform hover:scale-105 group"
                      title="View and download your student ID card"
                    >
                      <div className="text-3xl mb-2">🆔</div>
                      <p className="text-sm font-bold text-gray-800">ID Card</p>
                    </button>

                    <button
                      onClick={() => setActiveMenuItem('OnlineTest')}
                      className="bg-gradient-to-br from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 border-2 border-teal-200 rounded-xl p-4 transition-all transform hover:scale-105 group"
                    >
                      <div className="text-3xl mb-2">📝</div>
                      <p className="text-sm font-bold text-gray-800">Take Test</p>
                    </button>
                    <button
                      onClick={() => setActiveMenuItem('Results')}
                      className="bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-2 border-orange-200 rounded-xl p-4 transition-all transform hover:scale-105 group"
                    >
                      <div className="text-3xl mb-2">🎖️</div>
                      <p className="text-sm font-bold text-gray-800">Results</p>
                    </button>
                    <button
                      onClick={() => setActiveMenuItem('VideoClasses')}
                      className="bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border-2 border-purple-200 rounded-xl p-4 transition-all transform hover:scale-105 group"
                    >
                      <div className="text-3xl mb-2">🎥</div>
                      <p className="text-sm font-bold text-gray-800">Videos</p>
                    </button>

                    <button
                      onClick={() => setActiveMenuItem('StudyMaterial')}
                      className="bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border-2 border-orange-200 rounded-xl p-4 transition-all transform hover:scale-105 group"
                    >
                      <div className="text-3xl mb-2">📚</div>
                      <p className="text-sm font-bold text-gray-800">Materials</p>
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default NewStudentDashboard;
