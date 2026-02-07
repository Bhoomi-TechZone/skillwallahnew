import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getUserData } from '../../utils/authUtils';

const API_BASE_URL = 'http://localhost:4000';

// Helper function to validate ObjectId format
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
};

const StudentTestResult = ({ resultId: propResultId, onBack }) => {
  const { resultId: paramResultId } = useParams();
  const resultId = propResultId || paramResultId;
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    if (resultId && resultId.trim()) {
      loadTestResult();
    } else {
      setError('No valid result ID provided');
      setLoading(false);
    }
  }, [resultId]);

  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setError(null);
      loadTestResult();
    }
  };

  const loadTestResult = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const userData = getUserData();

      if (!token) {
        setError('Please login to view test results');
        return;
      }

      console.log('🔍 Loading test result for ID:', resultId);
      console.log('📊 Retry attempt:', retryCount + 1);

      // Enhanced localStorage search with multiple strategies
      const searchStrategies = [
        () => {
          // Strategy 1: Check lastTestResult
          const storedResult = localStorage.getItem('lastTestResult');
          if (storedResult) {
            try {
              const parsedResult = JSON.parse(storedResult);
              if (parsedResult && matchesResultId(parsedResult, resultId)) {
                return parsedResult;
              }
            } catch (e) {
              console.warn('Failed to parse lastTestResult:', e);
            }
          }
          return null;
        },
        () => {
          // Strategy 2: Search allTestResults
          const allResults = JSON.parse(localStorage.getItem('allTestResults') || '[]');
          return allResults.find(r => matchesResultId(r, resultId));
        },
        () => {
          // Strategy 3: Search quiz results if it's a quiz
          const quizResults = JSON.parse(localStorage.getItem('quizResults') || '[]');
          return quizResults.find(r => matchesResultId(r, resultId));
        },
        () => {
          // Strategy 4: Check recent test submissions
          const recentTests = JSON.parse(localStorage.getItem('recentTestSubmissions') || '[]');
          return recentTests.find(r => matchesResultId(r, resultId));
        }
      ];

      // Try each strategy
      for (const strategy of searchStrategies) {
        const foundResult = strategy();
        if (foundResult) {
          console.log('✅ Found result using localStorage strategy:', foundResult);
          setResult(enhanceResultData(foundResult));
          setLoading(false);
          return;
        }
      }

      // Try API only if we have a valid ObjectId format
      if (isValidObjectId(resultId)) {
        try {
          console.log('📡 Fetching from API with ObjectId:', resultId);
          const response = await axios.get(
            `${API_BASE_URL}/api/branch-results/results/${resultId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000 // 10 second timeout
            }
          );

          if (response.data) {
            console.log('✅ Found result from API:', response.data);
            const enhancedResult = enhanceResultData(response.data);
            setResult(enhancedResult);
            // Cache the result for future use
            localStorage.setItem('lastTestResult', JSON.stringify(enhancedResult));
            setLoading(false);
            return;
          }
        } catch (apiError) {
          console.error('❌ API error:', apiError.response?.data || apiError.message);
          if (apiError.code === 'ECONNABORTED') {
            setError('Request timeout. Please check your internet connection and try again.');
          }
        }
      } else {
        console.log('⚠️ Invalid ObjectId format, skipping API call:', resultId);
      }

      // If nothing found, show appropriate error
      setError(`Test result not found for "${resultId}". This might happen if:
• The test was not completed successfully
• The result has expired or been removed
• There's a connection issue with the server`);

    } catch (error) {
      console.error('❌ Error loading test result:', error);
      setError(`Failed to load test result: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to match result ID against various fields
  const matchesResultId = (result, targetId) => {
    if (!result || !targetId) return false;

    const fieldsToCheck = [
      result.id,
      result._id,
      result.test_id,
      result.testId,
      result.testName,
      result.test_name,
      result.paperSet?.name,
      result.paperSet?.title,
      result.quiz_id,
      result.quizId
    ];

    return fieldsToCheck.some(field =>
      field && field.toString().toLowerCase() === targetId.toString().toLowerCase()
    );
  };

  // Helper function to enhance result data with fallbacks
  const enhanceResultData = (rawResult) => {
    if (!rawResult) return null;

    return {
      ...rawResult,
      test_name: rawResult.test_name || rawResult.testName || rawResult.paperSet?.name || 'Test Result',
      total_questions: rawResult.total_questions || rawResult.totalQuestions || rawResult.questions?.length || 0,
      correct_answers: rawResult.correct_answers || rawResult.correctAnswers || 0,
      wrong_answers: rawResult.wrong_answers || rawResult.wrongAnswers || 0,
      obtained_marks: rawResult.obtained_marks || rawResult.score || 0,
      total_marks: rawResult.total_marks || rawResult.totalMarks || rawResult.total_questions || 0,
      percentage: rawResult.percentage || (rawResult.obtained_marks || rawResult.score || 0) / (rawResult.total_marks || rawResult.totalMarks || 1) * 100,
      submitted_at: rawResult.submitted_at || rawResult.submittedAt || rawResult.created_at || new Date().toISOString(),
      time_taken: rawResult.time_taken || rawResult.timeTaken || 0,
      status: rawResult.status || 'completed'
    };
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/students');
    }
  };

  const calculateGrade = (percentage) => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-orange-600' };
    if (percentage >= 80) return { grade: 'A', color: 'text-orange-600' };
    if (percentage >= 70) return { grade: 'B+', color: 'text-blue-600' };
    if (percentage >= 60) return { grade: 'B', color: 'text-blue-600' };
    if (percentage >= 50) return { grade: 'C', color: 'text-yellow-600' };
    if (percentage >= 40) return { grade: 'D', color: 'text-orange-600' };
    return { grade: 'F', color: 'text-red-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test result...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Result</h3>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed whitespace-pre-line">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {retryCount < maxRetries && (
              <button
                onClick={handleRetry}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again ({retryCount + 1}/{maxRetries})
              </button>
            )}
            <button
              onClick={handleBack}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => navigate('/students', { state: { activeTab: 'OnlineTest' } })}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Take New Test
            </button>
          </div>
          {retryCount >= maxRetries && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                💡 <strong>Tip:</strong> Try refreshing the page or contact support if the problem persists.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Result Found</h3>
          <p className="text-gray-600 mb-4">The test result could not be found.</p>
          <button
            onClick={handleBack}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const gradeInfo = calculateGrade(result.percentage || 0);
  const isPassed = (result.percentage || 0) >= 40;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-gray-900">Test Result</h1>
          <p className="text-gray-600">Detailed result for your test attempt</p>
        </div>
        <button
          onClick={handleBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors bg-gray-100 px-4 py-2 rounded-lg sm:bg-transparent sm:p-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back</span>
        </button>
      </div>

      {/* Result Summary Card */}
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-3 sm:gap-0">
          <h2 className="text-xl font-bold text-gray-800 text-center sm:text-left">{result.test_name || result.testName || 'Test Result'}</h2>
          <span className={`px-4 py-2 rounded-full text-sm font-bold ${isPassed ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>
            {isPassed ? '✅ Passed' : '❌ Failed'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          {/* Score */}
          <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">
              {result.obtained_marks || result.score || 0}/{result.total_marks || result.totalMarks || 0}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Score</div>
          </div>

          {/* Percentage */}
          <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1">
              {(result.percentage || 0).toFixed(1)}%
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Percentage</div>
          </div>

          {/* Grade */}
          <div className="text-center p-3 sm:p-4 bg-yellow-50 rounded-lg">
            <div className={`text-2xl sm:text-3xl font-bold mb-1 ${gradeInfo.color}`}>
              {gradeInfo.grade}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Grade</div>
          </div>

          {/* Time Taken */}
          <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg">
            <div className="text-xl sm:text-2xl font-bold text-orange-600 mb-1">
              {result.time_taken ? `${Math.floor(result.time_taken / 60)}m ${result.time_taken % 60}s` : 'N/A'}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Time Taken</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{(result.percentage || 0).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-1000 ${isPassed ? 'bg-orange-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(result.percentage || 0, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Detailed Analysis</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {result.total_questions || result.totalQuestions || 0}
            </div>
            <div className="text-sm text-gray-600">Total Questions</div>
          </div>

          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {result.correct_answers || result.correctAnswers || 0}
            </div>
            <div className="text-sm text-gray-600">Correct Answers</div>
          </div>

          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-red-600 mb-1">
              {result.wrong_answers || result.wrongAnswers || 0}
            </div>
            <div className="text-sm text-gray-600">Wrong Answers</div>
          </div>
        </div>
      </div>

      {/* Test Information */}
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        <h3 className="text-lg font-bold text-gray-800 mb-4">ℹ️ Test Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {result.submitted_at && (
            <div className="flex flex-col sm:flex-row justify-between py-2 border-b border-gray-100 gap-1 sm:gap-0">
              <span className="text-gray-600">Submitted At:</span>
              <span className="font-medium">
                {new Date(result.submitted_at).toLocaleString()}
              </span>
            </div>
          )}

          {result.status && (
            <div className="flex flex-col sm:flex-row justify-between py-2 border-b border-gray-100 gap-1 sm:gap-0">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium capitalize">{result.status}</span>
            </div>
          )}

          {result.course_name && (
            <div className="flex flex-col sm:flex-row justify-between py-2 border-b border-gray-100 gap-1 sm:gap-0">
              <span className="text-gray-600">Course:</span>
              <span className="font-medium">{result.course_name}</span>
            </div>
          )}

          {result.instructor && (
            <div className="flex flex-col sm:flex-row justify-between py-2 border-b border-gray-100 gap-1 sm:gap-0">
              <span className="text-gray-600">Instructor:</span>
              <span className="font-medium">{result.instructor}</span>
            </div>
          )}
        </div>
      </div>

      {/* Questions Review (if available) */}
      {result.questions && Array.isArray(result.questions) && result.studentAnswers && Array.isArray(result.studentAnswers) && (
        <div className="bg-white rounded-xl shadow-lg p-6 border">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📝 Question Review</h3>

          <div className="space-y-4">
            {result.questions.map((question, index) => {
              const studentAnswer = result.studentAnswers.find(a => a.question_id === question.id);
              const isCorrect = studentAnswer?.is_correct || false;

              return (
                <div key={question.id} className={`p-4 rounded-lg border ${isCorrect ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-start space-x-3">
                    <span className={`inline-block w-6 h-6 rounded-full text-center text-white text-sm font-bold ${isCorrect ? 'bg-orange-500' : 'bg-red-500'}`}>
                      {isCorrect ? '✓' : '✗'}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 mb-2">
                        {index + 1}. {question.question_text || question.text}
                      </p>

                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-gray-600">Your Answer: </span>
                          <span className={isCorrect ? 'text-orange-700 font-medium' : 'text-red-700 font-medium'}>
                            {studentAnswer?.selected_answer || 'No answer'}
                          </span>
                        </p>

                        {!isCorrect && (
                          <p>
                            <span className="text-gray-600">Correct Answer: </span>
                            <span className="text-orange-700 font-medium">
                              {question.correct_answer}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pb-8">
        <button
          onClick={handleBack}
          className="w-full sm:w-auto bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center font-medium"
        >
          ← Back to Tests
        </button>

        <button
          onClick={() => navigate('/students', { state: { activeTab: 'Results' } })}
          className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-medium"
        >
          📊 View All Results
        </button>

        <button
          onClick={() => window.print()}
          className="w-full sm:w-auto bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center font-medium"
        >
          🖨️ Print Result
        </button>
      </div>
    </div>
  );
};

export default StudentTestResult;
