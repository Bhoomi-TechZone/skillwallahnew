import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getUserData } from '../../utils/authUtils';
import { examResultsApi } from '../../api/examResultsApi';

const API_BASE_URL = 'http://localhost:4000';

const StudentResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [examResults, setExamResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [branch, setBranch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showCertificatePreview, setShowCertificatePreview] = useState(false);
  const [previewCertificate, setPreviewCertificate] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [certificateStatus, setCertificateStatus] = useState({
    unlocked: true,
    progress: 85,
    startedDate: '2025-01-01',
    daysLeft: '--'
  });
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averagePercent: 0,
    bestScore: 0,
    passingAttempts: 0,
    totalMarks: 0,
    obtainedMarks: 0,
    lastAttemptDate: '--'
  });
  useEffect(() => {
    loadResultsData();
    loadCertificateStatus();
    // Check if specific subject is selected from URL
    const urlParams = new URLSearchParams(location.search);
    const subject = urlParams.get('subject') || extractSubjectFromPath();
    if (subject) {
      setSelectedSubject(subject);
    }
  }, [location]);

  const extractSubjectFromPath = () => {
    // Extract subject from URL like /student/test-result/Science
    const pathParts = location.pathname.split('/');
    const subjectIndex = pathParts.findIndex(part => part === 'test-result') + 1;
    return pathParts[subjectIndex] || null;
  };

  const loadResultsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use consistent token key
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('authToken');
      const userData = getUserData();

      // Set student info immediately
      setStudentName(userData?.name || userData?.student_name || 'Student');
      setBranch(userData?.branch || userData?.branch_name || userData?.branch_code || '');

      if (!token) {
        throw new Error('Please login to view test results');
      }

      console.log('🔍 Loading student results...');
      console.log('📋 Student info:', { name: userData?.name, email: userData?.email, role: userData?.role });

      let results = [];
      let apiSuccess = false;

      // Try the correct student results endpoint first
      try {
        console.log('📡 Trying main student results endpoint...');
        const response = await axios.get(`${API_BASE_URL}/api/branch-results/student-results`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        if (response.data && response.data.success) {
          results = response.data.results || response.data.data || [];
          console.log('✅ Successfully fetched results from main endpoint:', results.length, 'results');
          apiSuccess = true;
        }
      } catch (apiError) {
        console.warn('⚠️ Main API endpoint failed:', apiError.message);
      }

      // Fallback to examResultsApi if main endpoint fails
      if (!apiSuccess || results.length === 0) {
        try {
          console.log('📡 Trying fallback examResultsApi...');
          const fallbackResponse = await examResultsApi.getResults();
          if (fallbackResponse && fallbackResponse.data) {
            results = Array.isArray(fallbackResponse.data) ? fallbackResponse.data :
              (fallbackResponse.results || []);
            console.log('✅ Fetched results from fallback API:', results.length, 'results');
            apiSuccess = true;
          }
        } catch (fallbackError) {
          console.warn('⚠️ Fallback API also failed:', fallbackError.message);
        }
      }

      // Check localStorage for cached results as last resort
      if (!apiSuccess || results.length === 0) {
        console.log('📱 Checking localStorage for cached results...');
        const localStorageKeys = [
          'studentTestResults', 'allTestResults', 'testResults', 'quizResults',
          'examResults', 'studentResults', 'recentTestSubmissions'
        ];

        for (const key of localStorageKeys) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const parsedResults = JSON.parse(cached);
              if (Array.isArray(parsedResults) && parsedResults.length > 0) {
                results = parsedResults;
                console.log(`✅ Using cached results from ${key}:`, results.length, 'results');
                break;
              }
            }
          } catch (e) {
            console.warn(`Failed to parse ${key}:`, e);
          }
        }
      }

      console.log('📊 Final results to process:', results);

      // Process and normalize the results
      const normalizedResults = normalizeResults(results);
      setExamResults(normalizedResults);

      // Calculate comprehensive stats
      calculateStats(normalizedResults);

      if (normalizedResults.length === 0) {
        setError('No test results found. Complete some tests to see your results here.');
      } else {
        console.log('✅ Successfully loaded and normalized', normalizedResults.length, 'results');
      }

    } catch (error) {
      console.error('❌ Error loading results:', error);
      setError(error.message || 'Failed to load test results. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  const loadCertificateStatus = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('authToken');
      if (!token) {
        console.log('📋 No token found for certificate status');
        return;
      }

      console.log('📡 Loading certificate status...');
      const response = await axios.get(`${API_BASE_URL}/api/students/certificate-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      });

      if (response.data) {
        console.log('✅ Certificate status loaded:', response.data);
        setCertificateStatus({
          unlocked: response.data.unlocked !== false,
          progress: response.data.progress || 85,
          startedDate: response.data.startedDate || response.data.started_date || '2025-01-01',
          daysLeft: response.data.daysLeft || response.data.days_left || '--'
        });
      }
    } catch (error) {
      console.warn('⚠️ Certificate status fetch failed:', error.message);
      // Keep default values - no need to show error to user for this
    }
  };

  const normalizeResults = (rawResults) => {
    if (!Array.isArray(rawResults)) {
      console.warn('⚠️ Expected array of results, got:', typeof rawResults, rawResults);
      return [];
    }

    return rawResults.map((result, index) => {
      console.log('🔄 Normalizing result:', result);

      return {
        id: result.id || result._id || result.result_id || `result_${index + 1}`,
        date: result.date || result.submitted_at || result.submittedAt || result.created_at || result.exam_date || new Date().toISOString(),
        testName: result.testName || result.test_name || result.title || result.name || result.paperSet?.name || result.quiz_title || result.exam_title || `Test ${index + 1}`,
        subject: result.subject || result.category || result.course_name || extractSubjectFromTestName(result.testName || result.test_name || result.title),
        totalQuestions: result.totalQuestions || result.total_questions || result.total_ques || result.questions?.length || result.max_questions || 0,
        attempted: result.attempted || result.attempted_questions || result.answered_questions || (result.totalQuestions - (result.leftQuestions || result.unanswered || 0)),
        leftQuestions: result.leftQuestions || result.left_questions || result.unanswered || result.not_answered || 0,
        rightQuestions: result.rightQuestions || result.right_questions || result.correct_answers || result.correctAnswers || result.correct_count || 0,
        wrongQuestions: result.wrongQuestions || result.wrong_questions || result.incorrect_answers || result.wrongAnswers || result.wrong_count || 0,
        totalMarks: result.totalMarks || result.total_marks || result.max_marks || result.total_score || result.totalQuestions || 0,
        obtainedMarks: result.obtainedMarks || result.obtained_marks || result.score || result.marks || result.total_score || 0,
        percentage: result.percentage || result.percent || calculatePercentage(result),
        grade: result.grade || calculateGrade(result),
        status: result.status || (result.attempted > 0 ? 'Completed' : 'Not Attempted'),
        timeTaken: result.timeTaken || result.time_taken || result.duration || result.time_spent || '00:00:00'
      };
    });
  };

  const extractSubjectFromTestName = (testName) => {
    if (!testName) return 'General';
    const subjects = ['Math', 'Science', 'English', 'Hindi', 'Computer', 'Physics', 'Chemistry', 'Biology'];
    for (const subject of subjects) {
      if (testName.toLowerCase().includes(subject.toLowerCase())) {
        return subject;
      }
    }
    return 'General';
  };

  const calculatePercentage = (result) => {
    const total = result.totalMarks || result.total_marks || result.totalQuestions || 1;
    const obtained = result.obtainedMarks || result.obtained_marks || result.score || result.rightQuestions || 0;
    return Math.round((obtained / total) * 100);
  };

  const calculateGrade = (result) => {
    const percentage = result.percentage || calculatePercentage(result);
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const calculateStats = (results) => {
    if (!results || results.length === 0) {
      setStats({
        totalAttempts: 0,
        averagePercent: 0,
        bestScore: 0,
        passingAttempts: 0,
        totalMarks: 0,
        obtainedMarks: 0,
        lastAttemptDate: '--'
      });
      return;
    }

    const completedResults = results.filter(r => r.attempted > 0);
    const totalAttempts = completedResults.length;
    const percentages = completedResults.map(r => r.percentage);
    const averagePercent = percentages.length > 0 ?
      Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length) : 0;
    const bestScore = percentages.length > 0 ? Math.max(...percentages) : 0;
    const passingAttempts = completedResults.filter(r => r.percentage >= 40).length;
    const totalMarks = completedResults.reduce((sum, r) => sum + r.totalMarks, 0);
    const obtainedMarks = completedResults.reduce((sum, r) => sum + r.obtainedMarks, 0);
    const lastAttemptDate = completedResults.length > 0 ?
      new Date(completedResults[0].date).toLocaleDateString() : '--';

    setStats({
      totalAttempts,
      averagePercent,
      bestScore,
      passingAttempts,
      totalMarks,
      obtainedMarks,
      lastAttemptDate
    });
  };

  const getFilteredResults = () => {
    let filtered = examResults;

    // Filter by selected subject if any
    if (selectedSubject) {
      filtered = filtered.filter(result =>
        result.subject?.toLowerCase() === selectedSubject.toLowerCase() ||
        result.testName?.toLowerCase().includes(selectedSubject.toLowerCase())
      );
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getUniqueSubjects = () => {
    const subjects = [...new Set(examResults.map(r => r.subject).filter(Boolean))];
    return subjects.sort();
  };

  const viewDetailedResult = (result) => {
    setSelectedResult(result);
    setShowDetailModal(true);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleDownloadMarksheet = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to download marksheet');
        return;
      }

      // Show loading state
      const loadingToast = document.createElement('div');
      loadingToast.innerHTML = 'Generating marksheet...';
      loadingToast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50';
      document.body.appendChild(loadingToast);

      const response = await axios.get(`${API_BASE_URL}/api/students/download-marksheet`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        responseType: 'blob'
      });

      // Determine file type from headers
      const contentType = response.headers['content-type'];
      const isPdf = contentType && contentType.includes('pdf');
      const extension = isPdf ? 'pdf' : 'png';
      const mimeType = isPdf ? 'application/pdf' : 'image/png';

      console.log('📄 Download content type:', contentType);

      // Create blob and download with correct type
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Marksheet_${studentName || 'Student'}_${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      document.body.removeChild(loadingToast);

      // Show success message
      const successToast = document.createElement('div');
      successToast.innerHTML = 'Marksheet downloaded successfully!';
      successToast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      document.body.appendChild(successToast);
      setTimeout(() => document.body.removeChild(successToast), 3000);

    } catch (error) {
      console.error('Marksheet download failed:', error);

      // Remove loading if exists
      const loadingToast = document.querySelector('div[class*="fixed top-4 right-4 bg-blue-500"]');
      if (loadingToast) document.body.removeChild(loadingToast);

      // Show error message
      const errorToast = document.createElement('div');
      errorToast.innerHTML = 'Failed to download marksheet. Please try again later.';
      errorToast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
      document.body.appendChild(errorToast);
      setTimeout(() => document.body.removeChild(errorToast), 5000);
    }
  };

  const handleDownloadCertificate = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to download certificate');
        return;
      }

      // Check if certificate is unlocked
      if (!certificateStatus?.unlocked) {
        alert('Certificate is not yet available. Complete more requirements to unlock it.');
        return;
      }

      // Show loading state
      const loadingToast = document.createElement('div');
      loadingToast.innerHTML = 'Generating certificate...';
      loadingToast.className = 'fixed top-4 right-4 bg-orange-500 text-white px-4 py-2 rounded shadow-lg z-50';
      document.body.appendChild(loadingToast);

      // First, get the certificate ID for the current student
      const studentId = getUserData()?.user_id || getUserData()?.student_id || getUserData()?.id;

      // Fetch certificates to get the certificate ID
      const certResponse = await axios.get(`${API_BASE_URL}/api/branch/certificates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          student_id: studentId
        }
      });

      if (certResponse.data && (certResponse.data.certificates || certResponse.data.data || Array.isArray(certResponse.data))) {
        let certificates = [];
        if (certResponse.data.certificates) {
          certificates = certResponse.data.certificates;
        } else if (certResponse.data.data) {
          certificates = certResponse.data.data;
        } else if (Array.isArray(certResponse.data)) {
          certificates = certResponse.data;
        }

        // Filter for generated/issued certificates
        const generatedCertificates = certificates.filter(cert =>
          cert.status === 'generated' || cert.status === 'issued'
        );

        if (generatedCertificates.length > 0) {
          // Get the most recent certificate
          const latestCertificate = generatedCertificates.sort((a, b) =>
            new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)
          )[0];

          // Download using the correct branch certificate endpoint
          const downloadResponse = await axios.get(`${API_BASE_URL}/api/branch/certificates/${latestCertificate._id || latestCertificate.id}/download`, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            responseType: 'blob'
          });

          // Create blob and download
          const blob = new Blob([downloadResponse.data], { type: 'image/png' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Certificate_${studentName || 'Student'}_${latestCertificate.certificate_number || Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } else {
          throw new Error('No generated certificates found for download');
        }
      } else {
        throw new Error('No certificates found for this student');
      }

      document.body.removeChild(loadingToast);

      // Show success message
      const successToast = document.createElement('div');
      successToast.innerHTML = 'Certificate downloaded successfully!';
      successToast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      document.body.appendChild(successToast);
      setTimeout(() => document.body.removeChild(successToast), 3000);

    } catch (error) {
      console.error('Certificate download failed:', error);

      // Remove loading if exists
      const loadingToast = document.querySelector('div[class*="fixed top-4 right-4 bg-orange-500"]');
      if (loadingToast) document.body.removeChild(loadingToast);

      // Show error message
      const errorToast = document.createElement('div');
      errorToast.innerHTML = `Failed to download certificate: ${error.message}. Please try again later.`;
      errorToast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
      document.body.appendChild(errorToast);
      setTimeout(() => document.body.removeChild(errorToast), 5000);
    }
  };

  // New function to preview certificate
  const handlePreviewCertificate = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to view certificate');
        return;
      }

      // Check if certificate is unlocked
      if (!certificateStatus?.unlocked) {
        alert('Certificate is not yet available. Complete more requirements to unlock it.');
        return;
      }

      setPreviewLoading(true);
      setPreviewCertificate(null);
      setShowCertificatePreview(true);

      // Use the working branch certificates endpoint that you confirmed works
      const response = await axios.get(`${API_BASE_URL}/api/branch/certificates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          // Filter by current student - using student_id from user data
          student_id: getUserData()?.user_id || getUserData()?.student_id || getUserData()?.id
        }
      });

      console.log('Certificate API Response:', response.data);

      if (response.data && (response.data.certificates || response.data.data || Array.isArray(response.data))) {
        // Handle different response formats
        let certificates = [];
        if (response.data.certificates) {
          certificates = response.data.certificates;
        } else if (response.data.data) {
          certificates = response.data.data;
        } else if (Array.isArray(response.data)) {
          certificates = response.data;
        }

        // Filter for generated/issued certificates
        const generatedCertificates = certificates.filter(cert =>
          cert.status === 'generated' || cert.status === 'issued'
        );

        if (generatedCertificates.length > 0) {
          // Sort by creation date to get the most recent
          const latestCertificate = generatedCertificates.sort((a, b) =>
            new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)
          )[0];

          console.log('Latest certificate found:', latestCertificate);
          setPreviewCertificate(latestCertificate);
        } else {
          throw new Error('No generated certificates found for this student');
        }
      } else {
        throw new Error('No certificates found in response');
      }

    } catch (error) {
      console.error('Certificate preview failed:', error);

      // Show error message instead of fallback
      setPreviewCertificate(null);
      alert(`Unable to load certificate preview: ${error.message}. Please try again later or contact support.`);
      setShowCertificatePreview(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Results</h3>
          <p className="text-gray-600 mb-4">{error}</p>

          {/* Debug information for troubleshooting */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left text-xs">
            <h4 className="font-semibold text-gray-700 mb-2">Troubleshooting Info:</h4>
            <div className="space-y-1 text-gray-600">
              <div>🔐 Token: {localStorage.getItem('token') ? '✓ Found' : '❌ Missing'}</div>
              <div>👤 User Data: {localStorage.getItem('user') ? '✓ Found' : '❌ Missing'}</div>
              <div>🌐 API URL: {API_BASE_URL}</div>
              <div>📧 User: {getUserData()?.email || 'Not found'}</div>
              <div>🏢 Role: {getUserData()?.role || 'Not found'}</div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={loadResultsData}
              className="bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition-colors w-full"
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => {
                // Clear cache and retry
                const cacheKeys = ['studentTestResults', 'allTestResults', 'testResults', 'examResults'];
                cacheKeys.forEach(key => localStorage.removeItem(key));
                loadResultsData();
              }}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors w-full"
            >
              🗑️ Clear Cache & Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredResults = getFilteredResults();
  const subjects = getUniqueSubjects();

  return (
    <div className="space-y-6">
      {/* Dynamic Header with Subject Filter */}
      {/* Dynamic Header with Subject Filter */}
      <div className="bg-gradient-to-r from-cyan-500 to-orange-500 rounded-2xl shadow-lg p-4 sm:p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="w-full">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 leading-tight">
              {selectedSubject ? `${selectedSubject} Results` : 'Test Results'}
              <span className="block sm:inline sm:ml-2 text-cyan-100 sm:text-white">- {studentName}</span>
            </h1>
            <p className="text-sm sm:text-lg opacity-90 mt-1 sm:mt-0">Branch: {branch || 'N/A'}</p>
          </div>

          {/* Subject Filter */}
          {subjects.length > 0 && (
            <div className="w-full md:w-auto mt-2 md:mt-0">
              <select
                value={selectedSubject || ''}
                onChange={(e) => setSelectedSubject(e.target.value || null)}
                className="w-full md:w-auto bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 py-2 rounded-lg focus:ring-2 focus:ring-white/50 focus:outline-none appearance-none cursor-pointer hover:bg-white/20 transition-colors"
                style={{ backgroundImage: 'none' }} // Remove default arrow to avoid contrast issues, or style it
              >
                <option value="" className="text-gray-800">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject} className="text-gray-800">{subject}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Attempts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 uppercase mb-2">Total Attempts</div>
          <div className="text-4xl font-bold text-gray-800 mb-2">{stats.totalAttempts}</div>
          <div className="text-xs text-gray-500">Tests completed</div>
        </div>

        {/* Average % */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 uppercase mb-2">Average Score</div>
          <div className="text-4xl font-bold text-gray-800 mb-2">{stats.averagePercent}%</div>
          <div className="text-xs text-gray-500">Across all attempts</div>
        </div>

        {/* Best Score */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 uppercase mb-2">Best Score</div>
          <div className="text-4xl font-bold text-gray-800 mb-2">{stats.bestScore}%</div>
          <div className="text-xs text-orange-600">Personal best</div>
        </div>

        {/* Passing Attempts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 uppercase mb-2">Pass Rate</div>
          <div className="text-4xl font-bold text-gray-800 mb-2">
            {stats.totalAttempts > 0 ? Math.round((stats.passingAttempts / stats.totalAttempts) * 100) : 0}%
          </div>
          <div className="text-xs text-gray-500">{stats.passingAttempts}/{stats.totalAttempts} passed</div>
        </div>
      </div>

      {/* Dynamic Results Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Table Header with Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b border-gray-200 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {selectedSubject ? `${selectedSubject} Results` : 'Test Results'}
            </h2>
            <p className="text-sm text-gray-600">
              Showing {filteredResults.length} of {examResults.length} results
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => loadResultsData()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center text-sm"
            >
              <span className="mr-1">🔄</span>
              Refresh
            </button>
            <button
              onClick={handlePrintReport}
              className="bg-gray-900 hover:bg-gray-800 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center text-sm"
            >
              <span className="mr-1">🖨️</span>
              Print
            </button>
          </div>
        </div>

        {/* Responsive Layout: Cards for Mobile, Table for Desktop */}
        <div>
          {/* Mobile Card View */}
          <div className="block lg:hidden p-4 space-y-4">
            {filteredResults.length === 0 ? (
              <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
                <div className="text-4xl mb-3">📊</div>
                <p>No test results found</p>
              </div>
            ) : (
              filteredResults.map((result, index) => (
                <div key={result.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-2 h-full ${result.percentage >= 80 ? 'bg-green-500' :
                    result.percentage >= 60 ? 'bg-blue-500' :
                      result.percentage >= 40 ? 'bg-orange-500' : 'bg-red-500'
                    }`}></div>

                  <div className="flex justify-between items-start pr-3">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{result.testName}</h3>
                      <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                        <span>📅 {new Date(result.date).toLocaleDateString()}</span>
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{result.subject}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${result.percentage >= 80 ? 'text-green-600' :
                        result.percentage >= 40 ? 'text-blue-600' : 'text-red-600'
                        }`}>
                        {result.percentage}%
                      </div>
                      <div className="text-xs font-medium text-gray-500 uppercase">{result.grade} Grade</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-gray-100">
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Marks</div>
                      <div className="font-semibold text-gray-700">{result.obtainedMarks}/{result.totalMarks}</div>
                    </div>
                    <div className="text-center border-l border-r border-gray-100">
                      <div className="text-xs text-gray-500">Attempted</div>
                      <div className="font-semibold text-blue-600">{result.attempted}/{result.totalQuestions}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Correct</div>
                      <div className="font-semibold text-green-600">{result.rightQuestions}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => viewDetailedResult(result)}
                    className="w-full bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-medium py-2 rounded-lg transition-colors flex items-center justify-center text-sm"
                  >
                    View Detailed Analysis →
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-orange-600 to-blue-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold min-w-[50px]">#</th>
                  <th className="px-4 py-3 text-left text-sm font-bold min-w-[100px]">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-bold min-w-[200px]">Test Name</th>
                  <th className="px-4 py-3 text-center text-sm font-bold min-w-[100px]">Subject</th>
                  <th className="px-4 py-3 text-center text-sm font-bold min-w-[80px]">Questions</th>
                  <th className="px-4 py-3 text-center text-sm font-bold min-w-[80px]">Attempted</th>
                  <th className="px-4 py-3 text-center text-sm font-bold min-w-[80px]">Correct</th>
                  <th className="px-4 py-3 text-center text-sm font-bold min-w-[80px]">Wrong</th>
                  <th className="px-4 py-3 text-center text-sm font-bold min-w-[80px]">Score</th>
                  <th className="px-4 py-3 text-center text-sm font-bold min-w-[60px]">%</th>
                  <th className="px-4 py-3 text-center text-sm font-bold min-w-[60px]">Grade</th>
                  <th className="px-4 py-3 text-center text-sm font-bold min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="px-4 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <div className="text-6xl mb-4">📊</div>
                        <p className="text-lg font-medium mb-2">No test results found</p>
                        <p className="text-sm">
                          {selectedSubject
                            ? `No results found for ${selectedSubject}. Try selecting a different subject.`
                            : 'Complete some tests to see your results here.'
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((result, index) => (
                    <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(result.date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs truncate" title={result.testName}>
                        {result.testName}
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                          {result.subject}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                        {result.totalQuestions}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-blue-600 font-medium">
                        {result.attempted}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-orange-600 font-bold">
                        {result.rightQuestions}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-red-600 font-bold">
                        {result.wrongQuestions}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                        {result.obtainedMarks}/{result.totalMarks}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${result.percentage >= 80 ? 'bg-orange-100 text-orange-800' :
                          result.percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            result.percentage >= 40 ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                          }`}>
                          {result.percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${result.grade === 'A+' || result.grade === 'A' ? 'bg-orange-100 text-orange-800' :
                          result.grade === 'B+' || result.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                            result.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                          }`}>
                          {result.grade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        <button
                          onClick={() => viewDetailedResult(result)}
                          className="bg-cyan-100 text-cyan-700 hover:bg-cyan-200 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Certificate & Marksheet Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Certificate Progress</h3>
          <div className="space-y-4">
            <div className="relative">
              <div className="bg-gray-200 rounded-full h-4">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-orange-400 to-orange-500 transition-all duration-500"
                  style={{ width: `${certificateStatus?.progress || 0}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600 mt-2">
                <span>Started: {certificateStatus?.startedDate || 'N/A'}</span>
                <span className="font-semibold">{certificateStatus?.progress || 0}%</span>
              </div>

              <div className="mt-2 text-center text-gray-500 text-sm">
                --:--:--:--
              </div>
            </div>
          </div>
        </div>

        {/* Actions Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Actions</h3>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleDownloadMarksheet}
              disabled={!certificateStatus.unlocked}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center w-full"
            >
              <span className="mr-2">⬇️</span>
              Marksheet
            </button>
            <button
              onClick={handleDownloadCertificate}
              disabled={!certificateStatus?.unlocked}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center w-full mb-2"
            >
              <span className="mr-2">🎓</span>
              Download Certificate
            </button>
            <button
              onClick={handlePreviewCertificate}
              disabled={!certificateStatus?.unlocked}
              className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center w-full"
            >
              <span className="mr-2">👁️</span>
              Preview Certificate
            </button>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            {certificateStatus?.unlocked ? (
              <div className="flex items-start mb-3">
                <span className="text-orange-600 text-lg mr-2">✅</span>
                <div>
                  <span className="font-semibold text-orange-600">Unlocked ✓</span>
                  <span className="ml-2 text-gray-600 text-sm">You can download Marksheet & Certificate.</span>
                </div>
              </div>
            ) : (
              <div className="flex items-start mb-3">
                <span className="text-orange-600 text-lg mr-2">🔒</span>
                <div>
                  <span className="font-semibold text-orange-600">Locked</span>
                  <span className="ml-2 text-gray-600 text-sm">Complete all requirements to unlock.</span>
                </div>
              </div>
            )}

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="mb-2">
                <span className="text-orange-600 font-bold text-lg">-- Days left</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-orange-400 transition-all duration-500"
                  style={{ width: `${certificateStatus.progress}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Started: {certificateStatus?.startedDate || 'N/A'}</span>
                <span className="font-semibold">{certificateStatus?.progress || 0}%</span>
              </div>

              <div className="mt-2 text-center text-gray-500 text-sm">
                --:--:--:--
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Result Modal */}
      {showDetailModal && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:fixed print:inset-0">
          <style>
            {`
              @media print {
                body * {
                  visibility: hidden;
                }
                #printable-result-section, #printable-result-section * {
                  visibility: visible;
                }
                #printable-result-section {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  margin: 0;
                  padding: 20px;
                  box-shadow: none !important;
                  max-height: none !important;
                  overflow: visible !important;
                  background: white !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}
          </style>
          <div id="printable-result-section" className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl print:bg-none print:text-black print:p-0 print:mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedResult.testName}</h2>
                  <p className="text-blue-100 mt-1 print:text-black">Detailed Test Result Analysis</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-white hover:text-gray-300 text-3xl font-light transition-colors no-print"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 print:p-0">
              {/* Test Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-2">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200 print:bg-white print:border-gray-300">
                  <div className="text-green-600 text-lg font-semibold print:text-black">Overall Score</div>
                  <div className="text-2xl font-bold text-green-700 print:text-black">
                    {selectedResult.obtainedMarks}/{selectedResult.totalMarks}
                  </div>
                  <div className="text-sm text-green-600 print:text-black">
                    {selectedResult.percentage}% ({selectedResult.grade} Grade)
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200 print:bg-white print:border-gray-300">
                  <div className="text-blue-600 text-lg font-semibold print:text-black">Test Date</div>
                  <div className="text-2xl font-bold text-blue-700 print:text-black">
                    {new Date(selectedResult.date).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-blue-600 print:text-black">
                    {new Date(selectedResult.date).toLocaleTimeString()}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200 print:bg-white print:border-gray-300">
                  <div className="text-purple-600 text-lg font-semibold print:text-black">Subject</div>
                  <div className="text-xl font-bold text-purple-700 print:text-black">
                    {selectedResult.subject || 'General'}
                  </div>
                  <div className="text-sm text-purple-600 print:text-black">Category</div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200 print:bg-white print:border-gray-300">
                  <div className="text-orange-600 text-lg font-semibold print:text-black">Duration</div>
                  <div className="text-xl font-bold text-orange-700 print:text-black">
                    {selectedResult.timeTaken || 'N/A'}
                  </div>
                  <div className="text-sm text-orange-600 print:text-black">Time Taken</div>
                </div>
              </div>

              {/* Performance Analysis */}
              <div className="bg-gray-50 rounded-xl p-6 print:bg-white print:border print:border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Performance Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
                  <div className="text-center">
                    <div className="bg-green-500 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2 text-xl font-bold print:border print:border-green-500 print:text-green-600 print:bg-white">
                      {selectedResult.rightQuestions || 0}
                    </div>
                    <div className="font-semibold text-green-600 print:text-black">Correct Answers</div>
                  </div>

                  <div className="text-center">
                    <div className="bg-red-500 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2 text-xl font-bold print:border print:border-red-500 print:text-red-600 print:bg-white">
                      {selectedResult.wrongQuestions || 0}
                    </div>
                    <div className="font-semibold text-red-600 print:text-black">Wrong Answers</div>
                  </div>

                  <div className="text-center">
                    <div className="bg-gray-500 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-2 text-xl font-bold print:border print:border-gray-500 print:text-gray-600 print:bg-white">
                      {selectedResult.leftQuestions || (selectedResult.totalQuestions - (selectedResult.rightQuestions || 0) - (selectedResult.wrongQuestions || 0))}
                    </div>
                    <div className="font-semibold text-gray-600 print:text-black">Not Attempted</div>
                  </div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Score Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg print:border print:border-gray-200 print:bg-white">
                    <span className="font-medium">Total Questions:</span>
                    <span className="font-bold text-gray-700">{selectedResult.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg print:border print:border-green-200 print:bg-white">
                    <span className="font-medium text-green-700 print:text-black">Correct Answers:</span>
                    <span className="font-bold text-green-700 print:text-black">{selectedResult.rightQuestions || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg print:border print:border-red-200 print:bg-white">
                    <span className="font-medium text-red-700 print:text-black">Wrong Answers:</span>
                    <span className="font-bold text-red-700 print:text-black">{selectedResult.wrongQuestions || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg print:border print:border-blue-200 print:bg-white">
                    <span className="font-medium text-blue-700 print:text-black">Accuracy Rate:</span>
                    <span className="font-bold text-blue-700 print:text-black">
                      {selectedResult.totalQuestions > 0
                        ? Math.round(((selectedResult.rightQuestions || 0) / selectedResult.totalQuestions) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg print:border print:border-purple-200 print:bg-white">
                    <span className="font-medium text-purple-700 print:text-black">Final Grade:</span>
                    <span className="font-bold text-purple-700 text-lg print:text-black">{selectedResult.grade}</span>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              {selectedResult.feedback && (
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 print:bg-white print:border-gray-300">
                  <h3 className="text-xl font-bold text-blue-800 mb-3 print:text-black">Feedback</h3>
                  <p className="text-blue-700 print:text-black">{selectedResult.feedback}</p>
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200 print:bg-white print:border-gray-300">
                <h3 className="text-xl font-bold text-yellow-800 mb-3 print:text-black">Recommendations</h3>
                <div className="space-y-2 text-yellow-700 print:text-black">
                  {selectedResult.percentage >= 80 ? (
                    <>
                      <p>🎉 Excellent performance! Keep up the great work.</p>
                      <p>💡 Consider taking advanced level tests to challenge yourself further.</p>
                    </>
                  ) : selectedResult.percentage >= 60 ? (
                    <>
                      <p>👍 Good job! You're on the right track.</p>
                      <p>📚 Review the topics you got wrong and practice more.</p>
                      <p>🎯 Aim for 80% or higher in your next attempt.</p>
                    </>
                  ) : (
                    <>
                      <p>🔄 Don't worry, there's room for improvement!</p>
                      <p>📖 Focus on studying the fundamental concepts.</p>
                      <p>🎓 Consider taking additional practice tests.</p>
                      <p>👨‍🏫 Reach out to your instructor for guidance.</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end space-x-3 no-print">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Print Result
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Preview Modal */}
      {showCertificatePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-orange-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Certificate Preview</h2>
                  <p className="text-purple-100 mt-1">View your certificate before downloading</p>
                </div>
                <button
                  onClick={() => {
                    setShowCertificatePreview(false);
                    setPreviewCertificate(null);
                    setPreviewLoading(false);
                  }}
                  className="text-white hover:text-gray-300 text-3xl font-light transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {previewLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading certificate preview...</p>
                </div>
              ) : previewCertificate ? (
                <div className="text-center">
                  {previewCertificate.file_path ? (
                    // Display the actual generated certificate
                    <div>
                      <img
                        src={`${API_BASE_URL}/${previewCertificate.file_path.replace(/\\/g, '/')}`}
                        alt="Certificate Preview"
                        className="mx-auto max-w-full h-auto rounded-lg shadow-lg border border-gray-200"
                        onError={(e) => {
                          console.error('Certificate image failed to load:', e.target.src);
                          // Show download option when image fails
                          e.target.style.display = 'none';
                          const errorMsg = e.target.nextSibling;
                          errorMsg.style.display = 'block';
                        }}
                      />
                      {/* Error message when image fails */}
                      <div style={{ display: 'none' }} className="text-center py-12">
                        <div className="text-6xl mb-4">⚠️</div>
                        <p className="text-red-600 text-lg font-semibold">Certificate preview not available</p>
                        <p className="text-gray-600 mt-2">You can still download your certificate</p>
                        <p className="text-sm text-gray-500 mt-1">File: {previewCertificate.file_path}</p>
                        <div className="mt-6 flex justify-center gap-4">
                          <button
                            onClick={() => {
                              setShowCertificatePreview(false);
                              handleDownloadCertificate();
                            }}
                            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors flex items-center"
                          >
                            <span className="mr-2">⬇️</span>
                            Download Certificate
                          </button>
                          <button
                            onClick={() => setShowCertificatePreview(false)}
                            className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // If no file_path, show error
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">⚠️</div>
                      <p className="text-red-600 text-lg font-semibold">Certificate not available</p>
                      <p className="text-gray-600 mt-2">This certificate doesn't have a generated file</p>
                      <p className="text-sm text-gray-500 mt-1">Certificate ID: {previewCertificate.certificate_number}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex justify-center gap-4">
                    <button
                      onClick={() => {
                        setShowCertificatePreview(false);
                        setPreviewCertificate(null);
                        handleDownloadCertificate();
                      }}
                      className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors flex items-center"
                    >
                      <span className="mr-2">⬇️</span>
                      Download Certificate
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors flex items-center"
                    >
                      <span className="mr-2">🖨️</span>
                      Print Certificate
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">⚠️</div>
                  <p className="text-gray-600 text-lg">Unable to load certificate preview</p>
                  <p className="text-gray-500 mt-2">Please try again or contact support</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentResults;
