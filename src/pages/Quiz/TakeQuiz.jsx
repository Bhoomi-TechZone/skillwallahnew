import { useEffect, useState } from 'react';
import Timer from '../../components/Timer';

// API Base URL - Update this to match your backend
const API_BASE_URL = 'http://localhost:4000';

const TakeQuiz = () => {
    const [answers, setAnswers] = useState({});
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [loading, setLoading] = useState(true);
    const [quizzes, setQuizzes] = useState([]);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [enrolledCourses, setEnrolledCourses] = useState([]);

    // Check authentication
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');

    useEffect(() => {
        if (!token) {
            setError('Please login to access quizzes');
            setLoading(false);
            return;
        }
        fetchEnrolledCourses();
    }, [token]);

    const fetchEnrolledCourses = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/dashboard/my-courses`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                const courses = data.courses || [];
                setEnrolledCourses(courses);
                if (courses.length > 0) {
                    fetchAvailableQuizzes(courses);
                } else {
                    setError('You are not enrolled in any courses');
                    setLoading(false);
                }
            } else {
                setError('Failed to fetch your enrolled courses');
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
            setError('Network error. Please try again.');
            setLoading(false);
        }
    };

    const fetchAvailableQuizzes = async (courses) => {
        try {
            const allQuizzes = [];

            console.log('🔍 Debug: Fetching quizzes for courses:', courses);

            for (const course of courses) {
                console.log(`🔍 Debug: Fetching quizzes for course ${course.title} (ID: ${course.id})`);

                const response = await fetch(`${API_BASE_URL}/quizzes/${course.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                console.log(`📝 Debug: Quiz API response status for ${course.title}:`, response.status);

                if (response.ok) {
                    const courseQuizzes = await response.json();
                    console.log(`✅ Debug: Got ${courseQuizzes.length} quizzes for ${course.title}:`, courseQuizzes);
                    courseQuizzes.forEach(quiz => {
                        quiz.course_title = course.title;
                        quiz.course_id = course.id;
                    });
                    allQuizzes.push(...courseQuizzes);
                } else {
                    const errorText = await response.text();
                    console.error(`❌ Debug: Quiz API error for ${course.title} (${response.status}):`, errorText);
                }
            }

            console.log('📊 Debug: Total quizzes collected:', allQuizzes.length, allQuizzes);
            setQuizzes(allQuizzes);
        } catch (error) {
            console.error('Error fetching quizzes:', error);
            setError('Failed to load quizzes');
        } finally {
            setLoading(false);
        }
    };

    const fetchQuizQuestions = async (quizId) => {
        try {
            setLoading(true);
            console.log('🔍 Debug: Fetching questions for quiz ID:', quizId);

            const response = await fetch(`${API_BASE_URL}/questions/${quizId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            console.log('📝 Debug: Questions API response status:', response.status);

            if (response.ok) {
                const questionsData = await response.json();
                console.log('✅ Debug: Got questions data:', questionsData);
                console.log('📊 Debug: Number of questions:', questionsData.length);
                setQuestions(questionsData);
                setAnswers({}); // Reset answers for new quiz
            } else {
                const errorText = await response.text();
                console.error('❌ Debug: Questions API error:', response.status, errorText);
                setError('Failed to load quiz questions');
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
            setError('Failed to load quiz questions');
        } finally {
            setLoading(false);
        }
    };

    const selectQuiz = (quiz) => {
        setSelectedQuiz(quiz);
        setShowResult(false);
        setError('');
        fetchQuizQuestions(quiz._id || quiz.id);
    };

    const handleChange = (qIndex, value) => {
        setAnswers({ ...answers, [qIndex]: value });
    };

    const handleSubmit = async () => {
        if (!selectedQuiz) return;

        setSubmitting(true);

        // Calculate score
        let correct = 0;
        questions.forEach((q, i) => {
            const userAnswer = answers[i] || '';
            const correctAnswer = q.correct_answer || '';

            if (userAnswer.toString().trim().toLowerCase() === correctAnswer.toString().trim().toLowerCase()) {
                correct++;
            }
        });

        setScore(correct);

        try {
            // Submit quiz attempt to backend (optional - for tracking)
            const attemptData = {
                quiz_id: selectedQuiz._id || selectedQuiz.id,
                answers: answers,
                score: correct,
                total_questions: questions.length,
                percentage: (correct / questions.length) * 100
            };

            await fetch(`${API_BASE_URL}/quiz-attempts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(attemptData)
            }).catch(err => console.log('Quiz attempt logging failed:', err));

        } catch (error) {
            console.error('Error submitting quiz attempt:', error);
            // Continue to show results even if logging fails
        } finally {
            setSubmitting(false);
            setShowResult(true);
        }
    };

    if (showResult) {
        const percent = (score / questions.length) * 100;
        let summaryMsg = '';
        let summaryColor = '';
        let level = '';
        let barColor = '';
        if (percent === 100) {
            summaryMsg = 'Perfect score! 🎉';
            summaryColor = 'text-orange-700';
            level = 'Expert';
            barColor = 'bg-orange-500';
        } else if (percent >= 70) {
            summaryMsg = 'Great job!';
            summaryColor = 'text-orange-600';
            level = 'Advanced';
            barColor = 'bg-blue-500';
        } else if (percent >= 40) {
            summaryMsg = 'Keep practicing!';
            summaryColor = 'text-yellow-600';
            level = 'Intermediate';
            barColor = 'bg-yellow-400';
        } else {
            summaryMsg = "Don't give up! Try again.";
            summaryColor = 'text-red-600';
            level = 'Beginner';
            barColor = 'bg-red-500';
        }
        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
                <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8 border border-yellow-100">
                    <h2 className="text-3xl sm:text-4xl font-bold text-center text-yellow-700 mb-8 drop-shadow-lg">📊 Quiz Results</h2>
                    {/* Level Graph */}
                    <div className="mb-6">
                        <div className="font-semibold text-lg text-center mb-2">Your Level: <span className={`px-3 py-1 rounded-full font-bold ${barColor} text-white`}>{level}</span></div>
                        <div className="w-full h-6 bg-gray-200 rounded-full flex items-center">
                            <div
                                className={`h-6 rounded-full transition-all duration-700 flex items-center justify-end pr-2 font-bold text-white ${barColor}`}
                                style={{ width: `${percent}%`, minWidth: '48px' }}
                            >
                                {Math.round(percent)}%
                            </div>
                        </div>
                    </div>
                    <div className="space-y-5">
                        <div className="bg-yellow-50 rounded-xl p-5 shadow border border-yellow-100 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-lg font-semibold text-yellow-900">{selectedQuiz?.title || 'Quiz'}</div>
                            <div className="text-base text-blue-700 font-bold">{score} / {questions.length}</div>
                            <div className="text-xs text-gray-500 mt-1 sm:mt-0">{new Date().toLocaleDateString()}</div>
                        </div>
                        <div className="text-sm text-gray-600 text-center">
                            Course: {selectedQuiz?.course_title || 'Unknown Course'}
                        </div>
                        <div className={`text-center text-lg font-semibold ${summaryColor}`}>{summaryMsg}</div>
                        <div className="w-full flex items-center justify-center my-2">
                            <div className="h-1 w-24 bg-gradient-to-r from-yellow-300 to-blue-200 rounded-full opacity-60"></div>
                        </div>
                        <div className="space-y-6">
                            {questions.map((q, i) => {
                                const userAns = answers[i] || '';
                                const correctAns = q.correct_answer || '';
                                const isCorrect = userAns.toString().trim().toLowerCase() === correctAns.toString().trim().toLowerCase();
                                return (
                                    <div key={i} className={`rounded-xl p-5 shadow border flex flex-col gap-2 ${isCorrect ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xl ${isCorrect ? 'text-orange-600' : 'text-red-500'}`}>{isCorrect ? '✔️' : '❌'}</span>
                                            <span className="font-semibold text-lg text-gray-900">{i + 1}. {q.text}</span>
                                        </div>
                                        <div className="ml-7">
                                            <span className="font-medium">Your answer:</span> <span className={isCorrect ? 'text-orange-700' : 'text-red-700'}>{userAns || <span className="italic text-gray-400">No answer</span>}</span>
                                        </div>
                                        {!isCorrect && (
                                            <div className="ml-7 text-sm text-blue-700">
                                                Correct answer: <span className="font-semibold">{correctAns}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-6 flex gap-4 justify-center">
                            <button
                                onClick={() => {
                                    setShowResult(false);
                                    setSelectedQuiz(null);
                                    setQuestions([]);
                                    setAnswers({});
                                }}
                                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                            >
                                Take Another Quiz
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
                <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading quizzes...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
                <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8 border border-red-100">
                    <div className="text-center">
                        <div className="text-red-600 text-6xl mb-4">⚠️</div>
                        <h2 className="text-2xl font-bold text-red-800 mb-4">Unable to Load Quizzes</h2>
                        <p className="text-red-600 mb-6">{error}</p>
                        {!token ? (
                            <a href="/student-dashboard" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                                Go to Login
                            </a>
                        ) : (
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Quiz selection screen
    if (!selectedQuiz) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
                <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
                    <h2 className="text-3xl sm:text-4xl font-bold text-center text-orange-800 mb-8 drop-shadow-lg">
                        📚 Available Quizzes
                    </h2>

                    {quizzes.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-gray-400 text-6xl mb-4">📝</div>
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Quizzes Available</h3>
                            <p className="text-gray-500">Your instructors haven't created any quizzes for your enrolled courses yet.</p>
                            <div className="mt-6">
                                <p className="text-sm text-gray-400">Enrolled Courses: {enrolledCourses.length}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {quizzes.map((quiz, index) => (
                                <div
                                    key={quiz._id || quiz.id || index}
                                    className="bg-gradient-to-br from-blue-50 to-orange-50 rounded-xl p-6 shadow border border-blue-100 hover:shadow-lg transition-shadow cursor-pointer"
                                    onClick={() => selectQuiz(quiz)}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold text-blue-800">{quiz.title}</h3>
                                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                            Quiz
                                        </span>
                                    </div>

                                    <p className="text-gray-600 mb-4 line-clamp-3">
                                        {quiz.description || 'Test your knowledge and skills'}
                                    </p>

                                    <div className="space-y-2 text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <span>📚</span>
                                            <span>Course: {quiz.course_title}</span>
                                        </div>
                                        {quiz.duration_minutes && (
                                            <div className="flex items-center gap-2">
                                                <span>⏱️</span>
                                                <span>Duration: {quiz.duration_minutes} minutes</span>
                                            </div>
                                        )}
                                        {quiz.max_attempts && (
                                            <div className="flex items-center gap-2">
                                                <span>🔄</span>
                                                <span>Max Attempts: {quiz.max_attempts}</span>
                                            </div>
                                        )}
                                    </div>

                                    <button className="mt-4 w-full bg-gradient-to-r from-blue-500 to-orange-600 hover:from-blue-600 hover:to-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                                        Start Quiz
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Check if all questions are answered
    const allAnswered = questions.every((_, i) => answers[i] && answers[i].toString().trim() !== '');

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
                {/* Quiz Header */}
                <div className="mb-6">
                    <button
                        onClick={() => {
                            setSelectedQuiz(null);
                            setQuestions([]);
                            setAnswers({});
                        }}
                        className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
                    >
                        ← Back to Quiz Selection
                    </button>
                    <h2 className="text-2xl font-bold text-center text-orange-800 mb-2">
                        {selectedQuiz?.title || 'Quiz'}
                    </h2>
                    <p className="text-center text-gray-600 text-sm">
                        Course: {selectedQuiz?.course_title || 'Unknown Course'}
                    </p>
                    {selectedQuiz?.description && (
                        <p className="text-center text-gray-500 text-sm mt-2">
                            {selectedQuiz.description}
                        </p>
                    )}
                </div>

                {/* Timer */}
                <div className="flex justify-center mb-6">
                    <Timer duration={selectedQuiz?.duration_minutes ? selectedQuiz.duration_minutes * 60 : 300} />
                </div>

                <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
                    <div className="space-y-8">
                        {questions.map((q, i) => (
                            <div key={i} className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                                <p className="font-semibold text-lg mb-3 text-orange-900">{i + 1}. {q.text}</p>

                                {/* MCQ Questions */}
                                {q.question_type === "mcq" && q.options && (
                                    <div className="flex flex-col gap-2 mt-2">
                                        {q.options.map((opt, idx) => (
                                            <label key={idx} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name={`q${i}`}
                                                    value={opt}
                                                    checked={answers[i] === opt}
                                                    onChange={() => handleChange(i, opt)}
                                                    className="accent-orange-600"
                                                />
                                                <span>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* True/False Questions */}
                                {q.question_type === "true_false" && (
                                    <div className="flex gap-6 mt-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={`q${i}`}
                                                value="True"
                                                checked={answers[i] === "True"}
                                                onChange={() => handleChange(i, "True")}
                                                className="accent-orange-600"
                                            />
                                            <span>True</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name={`q${i}`}
                                                value="False"
                                                checked={answers[i] === "False"}
                                                onChange={() => handleChange(i, "False")}
                                                className="accent-orange-600"
                                            />
                                            <span>False</span>
                                        </label>
                                    </div>
                                )}

                                {/* Fill in the blank Questions */}
                                {q.question_type === "fill_blanks" && (
                                    <input
                                        type="text"
                                        className="border border-orange-200 mt-1 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                                        onChange={(e) => handleChange(i, e.target.value)}
                                        placeholder="Type your answer..."
                                        value={answers[i] || ''}
                                    />
                                )}

                                {/* Subjective Questions */}
                                {q.question_type === "subjective" && (
                                    <textarea
                                        className="border border-orange-200 mt-1 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                                        onChange={(e) => handleChange(i, e.target.value)}
                                        placeholder="Type your answer..."
                                        value={answers[i] || ''}
                                        rows="4"
                                    />
                                )}

                                {i < questions.length - 1 && (
                                    <div className="w-full flex items-center justify-center mt-6">
                                        <div className="h-1 w-16 bg-gradient-to-r from-orange-200 to-blue-100 rounded-full opacity-50"></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {questions.length > 0 && (
                        <button
                            type="submit"
                            className={`mt-8 w-full bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow transition-colors duration-200 text-lg ${(!allAnswered || submitting) ? 'opacity-60 cursor-not-allowed' : ''}`}
                            disabled={!allAnswered || submitting}
                        >
                            {submitting ? 'Submitting...' : 'Submit Quiz'}
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default TakeQuiz;
