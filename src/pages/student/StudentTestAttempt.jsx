import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaClock, FaCheckCircle, FaTimes, FaFlag } from 'react-icons/fa';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000';

const StudentTestAttempt = ({ testId: propTestId, onBack }) => {
  const { testId: paramTestId } = useParams();
  const testId = propTestId || paramTestId; // Support both prop and URL param
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [paperSet, setPaperSet] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  // Load test on mount or when testId changes
  useEffect(() => {
    console.log('🚀 StudentTestAttempt mounted, testId:', testId);
    setInitialized(false);
    setTimerStarted(false);
    loadTest();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [testId]);

  // Start timer when test is initialized and timeRemaining is set
  useEffect(() => {
    if (initialized && timeRemaining > 0 && !timerStarted && !loading) {
      console.log('⏰ Starting timer with', timeRemaining, 'seconds');
      setTimerStarted(true);

      // Clear any existing timer first
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initialized, timeRemaining, timerStarted, loading]);

  const loadTest = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');

      // Get test data from localStorage (set by StudentOnlineTest)
      const currentTestData = localStorage.getItem('currentTest');
      let testData = null;

      if (currentTestData) {
        testData = JSON.parse(currentTestData);
        console.log('📋 Loaded test data from localStorage:', testData);

        // Support both old field names (title, duration) and new ones (paperName, timeLimit)
        const testName = testData.paperName || testData.title || 'Test';
        const duration = testData.timeLimit || testData.duration || 60;
        const numQuestions = testData.numberOfQuestions || testData.questions || 0;

        setPaperSet({
          paperName: testName,
          timeLimit: duration,
          numberOfQuestions: numQuestions,
          perQuestionMark: testData.perQuestionMark || 1,
          minusMarking: testData.minusMarking || 0,
          courseName: testData.courseName || testData.course || testData.subject || ''
        });
        setTimeRemaining(duration * 60); // Convert minutes to seconds
      }

      // Load questions - try multiple approaches
      let questionsResponse;
      let loadedQuestions = [];
      // Try to get the paper_set_id from multiple possible locations
      const paperSetId = testData?.paperSetId || testData?.paper_set_id || testData?.id || testData?._id || testId;
      
      console.log('🔍 Loading questions for paper set ID:', paperSetId);
      console.log('📋 Test data:', testData);
      console.log('📋 Course from test data:', testData?.course);
      console.log('📋 Subject from test data:', testData?.subject);

      // Approach 1: Try to load by paper_set_id
      // Always try this first if we have an ID, as it's the most reliable way to get questions for a specific paper
      if (paperSetId) {
        try {
          // Try both query params, preferring paper_set_id as it is the standard
          const queryParam = `paper_set_id=${paperSetId}`;
          console.log(`🔍 Fetching questions with query: ${queryParam}`);

          questionsResponse = await axios.get(
            `${API_BASE_URL}/api/questions/?page=1&limit=100&${queryParam}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );

          let potentialQuestions = Array.isArray(questionsResponse.data) ? questionsResponse.data :
            (questionsResponse.data.questions || []);

          // If we got questions, filter them to ensure they match the paper set
          if (potentialQuestions.length > 0) {
            console.log(`📝 API returned ${potentialQuestions.length} questions`);

            // In case API returns all questions despite filter
            const filtered = potentialQuestions.filter(q =>
              (q.paper_set_id === paperSetId) ||
              (q.paperId === paperSetId) ||
              (q.paper_set === paperSetId)
            );

            // If filtering resulted in match, use them. 
            if (filtered.length > 0) {
              loadedQuestions = filtered;
            } else if (potentialQuestions.length > 0) {
              // matched no IDs, but we implicitly trust the backend if it listened to our filter
              // Use them if they look like they belong to this paper (heuristic could be added)
              // checking if returned count matches expected count
              console.warn('⚠️ Frontend filter removed all questions, but using API response as fallback');
              loadedQuestions = potentialQuestions;
            }
          }

          console.log('📝 Questions by paper_set_id:', loadedQuestions.length);
        } catch (e) {
          console.log('⚠️ Failed to load by paper_set_id:', e.message);
        }
      }

      // Approach 2: If no questions found, load all available questions
      if (loadedQuestions.length === 0) {
        try {
          questionsResponse = await axios.get(
            `${API_BASE_URL}/api/questions/?page=1&limit=100`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );

          // Handle both array response and wrapped response { questions: [...] }
          loadedQuestions = Array.isArray(questionsResponse.data) ? questionsResponse.data :
            (questionsResponse.data.questions || questionsResponse.data.data || []);

          console.log('📝 All available questions raw:', questionsResponse.data);
          console.log('📝 All available questions extracted:', loadedQuestions.length);

          // Limit to numberOfQuestions if specified
          const numQ = testData?.numberOfQuestions || testData?.questions || loadedQuestions.length;
          if (numQ && numQ < loadedQuestions.length) {
            loadedQuestions = loadedQuestions.slice(0, numQ);
            console.log('📝 Limited to', numQ, 'questions');
          }
        } catch (e) {
          console.log('⚠️ Failed to load questions:', e.message);
        }
      }

      // Approach 3: If specific question IDs provided
      if (testData?.questionIds?.length > 0) {
        try {
          questionsResponse = await axios.get(
            `${API_BASE_URL}/api/questions/?page=1&limit=100`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          const allQuestions = Array.isArray(questionsResponse.data) ? questionsResponse.data : [];
          loadedQuestions = allQuestions.filter(q =>
            testData.questionIds.includes(q.id || q._id)
          );
          console.log('📝 Questions by IDs:', loadedQuestions.length);
        } catch (e) {
          console.log('⚠️ Failed to load by IDs:', e.message);
        }
      }
      
      // Approach 4: If no questions found and we have course information, load by course
      if (loadedQuestions.length === 0 && testData?.course) {
        try {
          console.log('🔍 Attempting to load questions by course:', testData.course);
          questionsResponse = await axios.get(
            `${API_BASE_URL}/api/questions/?page=1&limit=100&course=${encodeURIComponent(testData.course)}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          
          const courseQuestions = Array.isArray(questionsResponse.data) ? questionsResponse.data :
            (questionsResponse.data.questions || []);
          
          if (courseQuestions.length > 0) {
            loadedQuestions = courseQuestions;
            console.log('✅ Loaded', courseQuestions.length, 'questions by course');
            
            // Update paper set if needed to reflect the course
            if (!paperSet || !paperSet.courseName) {
              setPaperSet(prev => ({
                ...prev,
                courseName: testData.course,
                paperName: `${testData.course} Test`,
                numberOfQuestions: courseQuestions.length
              }));
            }
          } else {
            console.log('⚠️ No questions found for course:', testData.course);
          }
        } catch (e) {
          console.log('⚠️ Failed to load by course:', e.message);
        }
      }
      
      // Approach 5: If no questions found and we have subject information, load by subject
      if (loadedQuestions.length === 0 && testData?.subject) {
        try {
          console.log('🔍 Attempting to load questions by subject:', testData.subject);
          questionsResponse = await axios.get(
            `${API_BASE_URL}/api/questions/?page=1&limit=100&subject=${encodeURIComponent(testData.subject)}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          
          const subjectQuestions = Array.isArray(questionsResponse.data) ? questionsResponse.data :
            (questionsResponse.data.questions || []);
          
          if (subjectQuestions.length > 0) {
            loadedQuestions = subjectQuestions;
            console.log('✅ Loaded', subjectQuestions.length, 'questions by subject');
            
            // Update paper set if needed to reflect the subject
            if (!paperSet || !paperSet.courseName) {
              setPaperSet(prev => ({
                ...prev,
                courseName: testData.subject,
                paperName: `${testData.subject} Test`,
                numberOfQuestions: subjectQuestions.length
              }));
            }
          } else {
            console.log('⚠️ No questions found for subject:', testData.subject);
          }
        } catch (e) {
          console.log('⚠️ Failed to load by subject:', e.message);
        }
      }

      setQuestions(loadedQuestions);

      // Update paper set with actual question count
      if (loadedQuestions.length > 0) {
        setPaperSet(prev => ({
          ...prev,
          numberOfQuestions: loadedQuestions.length
        }));
      }

      // Mark as initialized after loading completes
      setInitialized(true);
      console.log('✅ Test initialized successfully');

    } catch (error) {
      console.error('Error loading test:', error);
      alert('Failed to load test');
      if (onBack) {
        onBack();
      } else {
        navigate('/student/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const toggleFlag = (questionId) => {
    setFlagged(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleAutoSubmit = () => {
    alert('Time is up! Submitting your test...');
    handleSubmit();
  };

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('access_token');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      const studentAnswers = questions.map(q => ({
        question_id: q.id,
        selected_answer: answers[q.id] || null,
        is_correct: answers[q.id] === q.correct_answer
      }));

      const correctCount = studentAnswers.filter(a => a.is_correct).length;
      const wrongCount = studentAnswers.filter(a => a.selected_answer && !a.is_correct).length;
      const unattemptedCount = studentAnswers.filter(a => !a.selected_answer).length;

      const totalMarks = correctCount * (paperSet.perQuestionMark || 1);
      const negativeMarks = wrongCount * (paperSet.minusMarking || 0);
      const finalMarks = totalMarks - negativeMarks;

      // Create a unique test identifier
      const testIdentifier = testId || paperSet.paperName || 'test';

      const payload = {
        paper_set_id: testIdentifier,
        student_id: userData.id || userData.user_id || userData.student_id || '',
        student_name: userData.name || userData.username || 'Student',
        test_name: paperSet.paperName || paperSet.paper_name || 'Test',
        subject: paperSet.paperName || testIdentifier,
        total_questions: questions.length,
        attempted_questions: questions.length - unattemptedCount,
        correct_answers: correctCount,
        wrong_answers: wrongCount,
        total_marks: questions.length * (paperSet.perQuestionMark || 1),
        obtained_marks: finalMarks,
        percentage: parseFloat(((finalMarks / (questions.length * (paperSet.perQuestionMark || 1))) * 100).toFixed(2)),
        status: finalMarks >= (questions.length * (paperSet.perQuestionMark || 1) * 0.4) ? 'passed' : 'failed',
        time_taken: (paperSet.timeLimit * 60) - timeRemaining,
        answers: studentAnswers  // Store answers for result viewing
      };

      console.log('📤 Submitting test:', payload);

      const response = await axios.post(
        `${API_BASE_URL}/api/branch-results/results`,
        payload,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      console.log('✅ Test submitted:', response.data);

      // Store result data for viewing
      const resultData = {
        ...payload,
        questions: questions,
        studentAnswers: answers,
        created_at: new Date().toISOString(),
        submitted_at: new Date().toISOString()
      };

      // Store last result
      localStorage.setItem('lastTestResult', JSON.stringify(resultData));

      // Store in all results array
      const allResults = JSON.parse(localStorage.getItem('allTestResults') || '[]');
      allResults.unshift(resultData); // Add to beginning
      localStorage.setItem('allTestResults', JSON.stringify(allResults));

      alert('Test submitted successfully!');
      const resultId = response.data.id || response.data.data?.id || testIdentifier;

      if (onBack) {
        // If using callback, just go back (parent will handle result view)
        onBack();
      } else {
        navigate(`/student/test-result/${resultId}`);
      }

    } catch (error) {
      console.error('❌ Error submitting test:', error);
      alert('Error submitting test: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }
  
  if (!paperSet || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-md">
          <p className="text-xl text-gray-800 mb-4">No questions available for this test</p>
          <button
            onClick={() => onBack ? onBack() : navigate('/students')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  console.log('🔍 Current question:', currentQ);
  console.log('🔍 Current question options:', currentQ?.options);
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.keys(flagged).filter(k => flagged[k]).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{paperSet.paperName}</h1>
              <p className="text-sm text-gray-600">{paperSet.courseName}</p>
            </div>
            <div className="flex w-full md:w-auto items-center justify-around md:justify-start space-x-0 md:space-x-6">
              <div className="text-center">
                <p className="text-xs text-gray-600">Questions</p>
                <p className="text-lg font-bold text-gray-900">{answeredCount}/{questions.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Flagged</p>
                <p className="text-lg font-bold text-yellow-600">{flaggedCount}</p>
              </div>
              <div className={`text-center px-4 py-2 rounded-lg ${timeRemaining < 300 ? 'bg-red-100' : 'bg-blue-100'}`}>
                <FaClock className={`w-5 h-5 mx-auto mb-1 ${timeRemaining < 300 ? 'text-red-600' : 'text-blue-600'}`} />
                <p className={`text-lg font-bold ${timeRemaining < 300 ? 'text-red-600' : 'text-blue-600'}`}>
                  {formatTime(timeRemaining)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Panel */}
          <div className="lg:col-span-3 space-y-6">
            {/* Question */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Question {currentQuestion + 1} of {questions.length}
                </h3>
                <button
                  onClick={() => toggleFlag(currentQ.id || currentQ._id)}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg transition-colors ${flagged[currentQ.id || currentQ._id] ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                    }`}
                >
                  <FaFlag />
                  <span className="text-sm">{flagged[currentQ.id || currentQ._id] ? 'Flagged' : 'Flag'}</span>
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-800 text-lg leading-relaxed">
                  {currentQ.question_text || currentQ.text || 'Question text not available'}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {(() => {
                  // Support both array options and individual option_a, option_b fields
                  const optionsArray = currentQ.options || [];
                  const optionLabels = ['A', 'B', 'C', 'D'];

                  // If options is an array, use it
                  if (Array.isArray(optionsArray) && optionsArray.length > 0) {
                    return optionsArray.map((optionText, index) => {
                      const optionLabel = optionLabels[index];
                      return (
                        <button
                          key={optionLabel}
                          onClick={() => handleAnswerSelect(currentQ.id || currentQ._id, optionLabel)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${answers[currentQ.id || currentQ._id] === optionLabel
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${answers[currentQ.id || currentQ._id] === optionLabel
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                              }`}>
                              {answers[currentQ.id || currentQ._id] === optionLabel && (
                                <FaCheckCircle className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <span className="font-semibold text-gray-700 mr-2">{optionLabel}.</span>
                              <span className="text-gray-800">{optionText}</span>
                            </div>
                          </div>
                        </button>
                      );
                    });
                  }

                  // Fallback to individual option fields
                  return optionLabels.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleAnswerSelect(currentQ.id || currentQ._id, option)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${answers[currentQ.id || currentQ._id] === option
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${answers[currentQ.id || currentQ._id] === option
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                          }`}>
                          {answers[currentQ.id || currentQ._id] === option && (
                            <FaCheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="font-semibold text-gray-700 mr-2">{option}.</span>
                          <span className="text-gray-800">
                            {currentQ[`option_${option.toLowerCase()}`] || currentQ[`option${option}`] || 'Option not available'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ));
                })()}
              </div>
            </div>

            {/* Navigation */}
            <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between">
              <button
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              <button
                onClick={() => {
                  const qId = currentQ.id || currentQ._id;
                  if (answers[qId]) {
                    setAnswers(prev => ({ ...prev, [qId]: null }));
                  }
                }}
                className="px-6 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                disabled={!answers[currentQ.id || currentQ._id]}
              >
                Clear Response
              </button>

              {currentQuestion < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>

          {/* Question Navigator */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-4 sticky top-24">
              <h4 className="font-semibold text-gray-900 mb-4">Question Navigator</h4>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {questions.map((q, index) => {
                  const qId = q.id || q._id;
                  return (
                    <button
                      key={qId}
                      onClick={() => setCurrentQuestion(index)}
                      className={`w-full aspect-square rounded-lg text-sm font-semibold transition-all ${currentQuestion === index
                        ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                        : answers[qId]
                          ? 'bg-orange-500 text-white'
                          : flagged[qId]
                            ? 'bg-yellow-400 text-gray-900'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-orange-500 rounded"></div>
                  <span className="text-gray-700">Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                  <span className="text-gray-700">Not Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-yellow-400 rounded"></div>
                  <span className="text-gray-700">Flagged</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-600 rounded"></div>
                  <span className="text-gray-700">Current</span>
                </div>
              </div>

              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="w-full mt-6 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold"
              >
                Submit Test
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Submit Test?</h3>
            <div className="space-y-2 mb-6 text-sm text-gray-700">
              <p>Total Questions: <span className="font-bold">{questions.length}</span></p>
              <p>Answered: <span className="font-bold text-orange-600">{answeredCount}</span></p>
              <p>Not Answered: <span className="font-bold text-red-600">{questions.length - answeredCount}</span></p>
              <p>Flagged: <span className="font-bold text-yellow-600">{flaggedCount}</span></p>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to submit? You won't be able to change your answers after submission.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentTestAttempt;
