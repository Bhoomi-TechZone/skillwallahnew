import { useState, useEffect } from 'react';
import axios from 'axios';
import { getUserData } from '../../utils/authUtils';
import { useNavigate } from 'react-router-dom';
import branchStudentDashboardService from '../../services/branchStudentDashboardService';

const API_BASE_URL = 'http://localhost:4000';

const StudentOnlineTest = ({ onStartTest, onViewResult }) => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    loadOnlineTests();
  }, []);

  const loadOnlineTests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      if (!token) {
        console.error('No access token found');
        setLoading(false);
        return;
      }

      console.log('📝 [StudentOnlineTest] Loading questions...');

      const response = await axios.get(
        `${API_BASE_URL}/api/questions/?page=1&limit=100`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ [StudentOnlineTest] Response:', response.data);

      // Backend returns { success: true, questions: [...], total, page, limit, total_pages }
      const questionsData = response.data?.questions || (Array.isArray(response.data) ? response.data : []);

      console.log('📝 [StudentOnlineTest] Questions received:', questionsData.length, questionsData);

      // Group questions by subject/course to create test cards
      const testsMap = new Map();

      questionsData.forEach(question => {
        // Prioritize grouping by paper_set_id or paperId if available
        const paperId = question.paper_set_id || question.paperId || question.paper_set;
        // If not available, fallback to subject or course
        const key = paperId || question.subject || question.course || 'General';

        if (!testsMap.has(key)) {
          // Determine title based on available info
          let title = question.paper_name || question.test_name || question.title;
          if (!title) {
            title = paperId ? `Test Paper ${key.slice(-4)}` : (question.subject || 'General Test');
          }

          testsMap.set(key, {
            id: paperId || question.id || question._id || Math.random().toString(36),
            paperSetId: paperId, // Explicitly store paperSetId
            title: title,
            paperNumber: paperId ? `#${paperId.slice(-6).toUpperCase()}` : `#${(question.subject || 'GEN').slice(0, 4).toUpperCase()}`,
            status: 'Open',
            questions: 0,
            duration: question.duration || 60, // Use question's duration if available
            course: question.course || 'N/A',
            courseCategory: question.category || question.subject || '',
            perQuestionMark: question.marks || 1,
            minusMarking: question.negative_marks || 0,
            availableFrom: question.created_at,
            availableTo: null,
            branchCode: question.branch_code,
            franchiseCode: question.franchise_code,
            opened: question.created_at ? new Date(question.created_at).toLocaleDateString() : 'N/A',
            questionIds: []
          });
        }

        const test = testsMap.get(key);
        test.questions++;
        test.questionIds.push(question.id || question._id);
      });

      const transformedTests = Array.from(testsMap.values());

      setTests(transformedTests);
      console.log(`📝 [StudentOnlineTest] Loaded ${transformedTests.length} test sets from ${questionsData.length} questions`);
      setLoading(false);

    } catch (error) {
      console.error('❌ [StudentOnlineTest] Error loading online tests:', error);
      setTests([]);
      setLoading(false);
    }
  };

  const loadSyllabuses = async () => {
    try {
      const token = localStorage.getItem('access_token');

      if (!token) {
        console.error('No access token found');
        return;
      }

      console.log('📚 [StudentOnlineTest] Loading syllabuses...');

      const response = await axios.get(
        `${API_BASE_URL}/api/branch-students/study-materials`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ [StudentOnlineTest] Syllabus response:', response.data);

      const syllabusData = response.data.study_materials || [];
      setSyllabuses(syllabusData);
      console.log(`📚 [StudentOnlineTest] Loaded ${syllabusData.length} syllabuses`);

    } catch (error) {
      console.error('❌ [StudentOnlineTest] Error loading syllabuses:', error);
      setSyllabuses([]);
    }
  };

  const handleDownloadSyllabus = async (materialId, fileUrl, externalLink) => {
    const token = localStorage.getItem('access_token');

    if (fileUrl) {
      // Track download
      try {
        await axios.post(
          `${API_BASE_URL}/api/branch-study-materials/materials/${materialId}/download`,
          {},
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
      } catch (err) {
        console.error('Download tracking failed:', err);
      }
      window.open(fileUrl, '_blank');
    } else if (externalLink) {
      window.open(externalLink, '_blank');
    }
  };

  const getFilteredTests = () => {
    switch (activeTab) {
      case 'Open':
        return tests.filter(test => test.status === 'Open' || test.status === 'open');
      case 'Waiting':
        return tests.filter(test => test.status === 'Waiting' || test.status === 'waiting');
      case 'Completed':
        return tests.filter(test => test.status === 'Completed' || test.status === 'completed' || test.status === 'Complete');
      default:
        return tests;
    }
  };

  const getStatusCount = (status) => {
    if (status === 'All') return tests.length;
    return tests.filter(test => {
      const testStatus = test.status?.toLowerCase();
      return testStatus === status.toLowerCase();
    }).length;
  };

  const handleStartTest = (test) => {
    console.log('🚀 Starting test:', test);
    // Store test data in localStorage for the test attempt page
    localStorage.setItem('currentTest', JSON.stringify(test));

    const testId = test.id || test._id;
    if (!testId) {
      console.error('No test ID found:', test);
      alert('Unable to start test. Test ID not found.');
      return;
    }

    // If onStartTest prop is provided, use it (for inline dashboard mode)
    if (onStartTest) {
      console.log('📌 Using onStartTest callback with testId:', testId);
      onStartTest(testId);
    } else {
      // Navigate to test page with test ID
      console.log('📌 Navigating to test page:', `/student/test/${testId}`);
      navigate(`/student/test/${testId}`);
    }
  };

  const handleViewResultClick = (testId) => {
    // If onViewResult prop is provided, use it
    if (onViewResult) {
      onViewResult(testId);
    } else {
      // Navigate to results page
      navigate(`/student/test-result/${testId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading online tests...</p>
        </div>
      </div>
    );
  }

  const filteredTests = getFilteredTests();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 pb-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-2xl">
        <div className="max-w-8xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center">
                <span className="mr-4 text-5xl">📝</span>
                Question Papers & Practice Sets
              </h1>
              <p className="text-white/90 text-lg">
                Access previous year papers and practice questions
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end space-y-2">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3">
                <p className="text-white/80 text-sm">Available Papers</p>
                <p className="text-3xl font-bold text-white">{tests.filter(t => t.questions > 0).length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-6 -mt-6">
        {/* Question Papers Section */}
        <div className="space-y-6">

          {tests.filter(t => t.questions > 0).length === 0 ? (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-16 text-center">
              <div className="text-8xl mb-6">❓</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">No Question Papers Available</h3>
              <p className="text-gray-600 text-lg">Question papers will appear here once uploaded</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tests.filter(t => t.questions > 0).map((test) => {
                const isCompleted = test.status === 'Completed' || test.status === 'completed' || test.status === 'Complete';
                const isOpen = test.status === 'Open' || test.status === 'open';

                return (
                  <div
                    key={test.id}
                    className={`group rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl ${isCompleted ? 'bg-gradient-to-br from-emerald-500 via-orange-500 to-teal-500' :
                      isOpen ? 'bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500' :
                        'bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500'
                      }`}
                  >
                    {/* Card Header */}
                    <div className="p-6 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>

                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="font-bold text-xl leading-tight flex-1 pr-3">
                            {test.title}
                          </h3>
                          <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-lg ${isCompleted ? 'bg-white/30 text-white backdrop-blur-sm' :
                            isOpen ? 'bg-white text-indigo-600' :
                              'bg-white/30 text-white backdrop-blur-sm'
                            }`}>
                            {test.status}
                          </span>
                        </div>
                        {test.courseCategory && (
                          <p className="text-sm text-white/90 flex items-center">
                            <span className="mr-2">📂</span>
                            {test.courseCategory}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="bg-white p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-200">
                          <p className="text-xs text-gray-600 font-semibold mb-1">Questions</p>
                          <p className="text-2xl font-bold text-indigo-700">{test.questions}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 rounded-xl border border-purple-200">
                          <p className="text-xs text-gray-600 font-semibold mb-1">Duration</p>
                          <p className="text-2xl font-bold text-purple-700">{test.duration} Min</p>
                        </div>
                        {test.perQuestionMark && (
                          <div className="bg-gradient-to-br from-orange-50 to-emerald-50 p-3 rounded-xl border border-orange-200">
                            <p className="text-xs text-gray-600 font-semibold mb-1">Marks/Q</p>
                            <p className="text-2xl font-bold text-orange-700">{test.perQuestionMark}</p>
                          </div>
                        )}
                        {test.minusMarking !== undefined && (
                          <div className="bg-gradient-to-br from-red-50 to-orange-50 p-3 rounded-xl border border-red-200">
                            <p className="text-xs text-gray-600 font-semibold mb-1">Negative</p>
                            <p className="text-2xl font-bold text-red-700">{test.minusMarking}</p>
                          </div>
                        )}
                      </div>

                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                        <p className="text-xs font-bold text-gray-700 mb-2 flex items-center">
                          <span className="mr-2">📚</span>Course Details
                        </p>
                        <p className="text-sm text-gray-800 font-medium leading-relaxed">{test.course}</p>
                      </div>

                      {test.availableFrom && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-200">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-700">
                              <span className="font-bold">📅 From:</span> {new Date(test.availableFrom).toLocaleDateString()}
                            </span>
                            {test.availableTo && (
                              <span className="text-gray-700">
                                <span className="font-bold">To:</span> {new Date(test.availableTo).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      )}



                      {/* Action Buttons */}
                      <div className="space-y-3 pt-3">
                        {isCompleted ? (
                          <>
                            <div className="bg-gradient-to-r from-orange-500 to-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-center shadow-lg flex items-center justify-center">
                              <span className="mr-2">✅</span>
                              Completed
                            </div>
                            <button
                              onClick={() => handleViewResultClick(test.id)}
                              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center group"
                            >
                              <span className="mr-2 group-hover:scale-110 transition-transform">👁️</span>
                              View Result & Answers
                            </button>
                          </>
                        ) : isOpen ? (
                          <button
                            onClick={() => handleStartTest(test)}
                            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-2xl flex items-center justify-center group border-2 border-white/20"
                          >
                            <span className="mr-3 text-2xl group-hover:scale-125 transition-transform">▶️</span>
                            <span className="text-lg">Start Test Now</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="w-full bg-gradient-to-r from-gray-400 to-gray-500 text-white font-bold py-4 px-4 rounded-xl cursor-not-allowed opacity-75"
                          >
                            <span className="mr-2">⏳</span>
                            Waiting to Open
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentOnlineTest;
