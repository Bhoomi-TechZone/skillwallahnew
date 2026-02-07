import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

// API Base URL - Update this to match your backend
const API_BASE_URL = 'http://localhost:4000';

const CreateQuiz = () => {

    const [quiz, setQuiz] = useState({
        title: '',
        courseId: '',
        description: '',
        duration: 30,
        maxAttempts: 1,
        questions: []
    });
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isInstructorLoggedIn, setIsInstructorLoggedIn] = useState(false);
    const [question, setQuestion] = useState({
        text: '',
        type: 'mcq',
        options: ['', '', '', ''],
        answer: '',
    });
    const [questionError, setQuestionError] = useState('');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [inputMethod, setInputMethod] = useState('manual'); // 'manual', 'paste', 'pdf'
    const [bulkText, setBulkText] = useState('');
    const [pdfFile, setPdfFile] = useState(null);
    const [processingBulk, setProcessingBulk] = useState(false);

    // Check if instructor is logged in when component mounts
    useEffect(() => {
        const token = localStorage.getItem('instructorToken');
        if (!token) {
            setIsInstructorLoggedIn(false);
            setLoading(false);
            return;
        }
        setIsInstructorLoggedIn(true);
        console.log('CreateQuiz component mounted, fetching courses...');
        fetchInstructorCourses();
    }, []);

    const fetchInstructorCourses = async () => {
        try {
            setLoading(true);

            // Get instructor token
            const token = localStorage.getItem('instructorToken');
            if (!token) {
                console.error('No instructor token found');
                setLoading(false);
                return;
            }

            // Use the instructor-specific endpoint that only returns courses created by this instructor
            const response = await fetch(`${API_BASE_URL}/instructor/courses`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Fetched instructor courses:', data);

            setCourses(data); // These are only courses created by the current instructor
        } catch (error) {
            console.error('Error fetching instructor courses:', error);
            setCourses([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };


    const handleQuestionChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('option')) {
            const idx = parseInt(name.replace('option', ''));
            setQuestion((q) => ({ ...q, options: q.options.map((opt, i) => (i === idx ? value : opt)) }));
        } else {
            setQuestion((q) => ({ ...q, [name]: value }));
        }
    };

    const handleAddQuestion = (e) => {
        e.preventDefault();
        // Validation
        if (!question.text.trim()) {
            setQuestionError('Question text is required.');
            return;
        }
        if (question.type === 'mcq') {
            if (question.options.some((opt) => !opt.trim())) {
                setQuestionError('All MCQ options are required.');
                return;
            }
            if (!question.answer.trim()) {
                setQuestionError('Correct answer is required.');
                return;
            }
            if (!question.options.includes(question.answer)) {
                setQuestionError('Correct answer must match one of the options.');
                return;
            }
        } else if (question.type === 'boolean') {
            if (!question.answer.trim()) {
                setQuestionError('Correct answer is required.');
                return;
            }
            if (!['True', 'False'].includes(question.answer)) {
                setQuestionError('Answer must be True or False.');
                return;
            }
        } else if (question.type === 'fill') {
            if (!question.answer.trim()) {
                setQuestionError('Correct answer is required.');
                return;
            }
        }
        setQuiz((qz) => ({ ...qz, questions: [...qz.questions, question] }));
        setQuestion({ text: '', type: 'mcq', options: ['', '', '', ''], answer: '' });
        setQuestionError('');
    };

    const handleRemoveQuestion = (idx) => {
        setQuiz((qz) => ({ ...qz, questions: qz.questions.filter((_, i) => i !== idx) }));
    };

    const processBulkText = () => {
        if (!bulkText.trim()) {
            setQuestionError('Please enter questions in the text area.');
            return;
        }

        setProcessingBulk(true);
        setQuestionError('');

        try {
            const lines = bulkText.split('\n').filter(line => line.trim());
            const questions = [];
            let currentQuestion = null;
            let currentOptions = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Skip empty lines
                if (!line) continue;

                // Check if line starts with a number (question)
                if (/^\d+\.?\s/.test(line)) {
                    // Save previous question if exists
                    if (currentQuestion) {
                        questions.push(currentQuestion);
                    }

                    // Start new question
                    const questionText = line.replace(/^\d+\.?\s/, '');
                    currentQuestion = {
                        text: questionText,
                        type: 'mcq',
                        options: ['', '', '', ''],
                        answer: ''
                    };
                    currentOptions = [];
                }
                // Check if line starts with a letter (option)
                else if (/^[a-d][\.\)]\s/i.test(line) && currentQuestion) {
                    const optionText = line.replace(/^[a-d][\.\)]\s/i, '');
                    currentOptions.push(optionText);
                }
                // Check if line starts with "Answer:" or "Ans:"
                else if (/^(answer|ans):\s/i.test(line) && currentQuestion) {
                    const answerText = line.replace(/^(answer|ans):\s/i, '');

                    // Update question options and answer
                    if (currentOptions.length > 0) {
                        // Fill options array
                        for (let j = 0; j < Math.min(4, currentOptions.length); j++) {
                            currentQuestion.options[j] = currentOptions[j];
                        }

                        // Set correct answer
                        const answerLetter = answerText.toLowerCase().trim();
                        if (['a', 'b', 'c', 'd'].includes(answerLetter)) {
                            const answerIndex = answerLetter.charCodeAt(0) - 97; // a=0, b=1, c=2, d=3
                            if (answerIndex < currentOptions.length) {
                                currentQuestion.answer = currentOptions[answerIndex];
                            }
                        } else {
                            // Direct answer text
                            currentQuestion.answer = answerText;
                        }
                    } else {
                        // True/False or Fill in the blank
                        if (['true', 'false'].includes(answerText.toLowerCase())) {
                            currentQuestion.type = 'boolean';
                            currentQuestion.answer = answerText.charAt(0).toUpperCase() + answerText.slice(1).toLowerCase();
                        } else {
                            currentQuestion.type = 'fill';
                            currentQuestion.answer = answerText;
                        }
                    }
                }
            }

            // Add the last question
            if (currentQuestion) {
                questions.push(currentQuestion);
            }

            // Validate and add questions
            const validQuestions = questions.filter(q => {
                return q.text &&
                    ((q.type === 'mcq' && q.options.some(opt => opt) && q.answer) ||
                        (q.type === 'boolean' && ['True', 'False'].includes(q.answer)) ||
                        (q.type === 'fill' && q.answer));
            });

            if (validQuestions.length === 0) {
                setQuestionError('No valid questions found. Please check the format.');
                return;
            }

            // Add questions to quiz
            setQuiz((qz) => ({ ...qz, questions: [...qz.questions, ...validQuestions] }));
            setBulkText('');
            setInputMethod('manual');

        } catch (error) {
            console.error('Error processing bulk text:', error);
            setQuestionError('Error processing questions. Please check the format.');
        } finally {
            setProcessingBulk(false);
        }
    };

    const processPdfFile = async () => {
        if (!pdfFile) {
            setQuestionError('Please select a PDF file.');
            return;
        }

        setProcessingBulk(true);
        setQuestionError('');

        try {
            const formData = new FormData();
            formData.append('file', pdfFile);

            const token = localStorage.getItem('instructorToken');
            const response = await fetch(`${API_BASE_URL}/quizzes/extract-questions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                if (data.questions && data.questions.length > 0) {
                    setQuiz((qz) => ({ ...qz, questions: [...qz.questions, ...data.questions] }));
                    setPdfFile(null);
                    setInputMethod('manual');
                } else {
                    setQuestionError('No questions found in the PDF. Please try manual entry.');
                }
            } else {
                const errorData = await response.json().catch(() => ({}));

                if (response.status === 501) {
                    // PDF processing not available
                    setQuestionError('PDF processing is not available. Please install PyPDF2 on the server or use the copy-paste option.');
                } else {
                    // Other errors - show text area for manual copy-paste
                    setQuestionError(errorData.detail || 'PDF processing failed. Please copy the text from PDF and use the paste option.');
                }
                setInputMethod('paste');
            }
        } catch (error) {
            console.error('Error processing PDF:', error);
            setQuestionError('Error processing PDF. Please try copying text from PDF and using paste option.');
            setInputMethod('paste');
        } finally {
            setProcessingBulk(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Get instructor token
        const token = localStorage.getItem('instructorToken');
        if (!token) {
            alert('Please login as instructor first');
            return;
        }

        if (!quiz.title.trim()) {
            alert('Quiz title is required!');
            return;
        }
        if (!quiz.courseId) {
            alert('Please select a course!');
            return;
        }
        if (quiz.questions.length === 0) {
            alert('Please add at least one question!');
            return;
        }

        setSaving(true);

        try {
            const token = localStorage.getItem('instructorToken');

            // First create the quiz
            const quizData = {
                course_id: quiz.courseId,
                title: quiz.title,
                description: quiz.description || null,
                quiz_type: "mcq", // Default type, you can make this dynamic
                duration_minutes: quiz.duration,
                max_attempts: quiz.maxAttempts
            };

            console.log('Creating quiz:', quizData);

            const quizResponse = await fetch(`${API_BASE_URL}/quizzes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(quizData)
            });

            if (!quizResponse.ok) {
                const errorData = await quizResponse.json();
                throw new Error(`Failed to create quiz: ${errorData.detail || 'Unknown error'}`);
            }

            const quizResult = await quizResponse.json();
            const quizId = quizResult.quiz_id;
            console.log('Quiz created successfully:', quizResult);

            // Then add each question to the quiz
            for (const question of quiz.questions) {
                const questionData = {
                    quiz_id: quizId,
                    text: question.text,
                    options: question.type === 'mcq' ? question.options : null,
                    correct_answer: question.answer,
                    question_type: question.type === 'mcq' ? 'mcq' :
                        question.type === 'boolean' ? 'true_false' : 'fill_blanks'
                };

                console.log('Adding question:', questionData);

                const questionResponse = await fetch(`${API_BASE_URL}/questions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(questionData)
                });

                if (!questionResponse.ok) {
                    const errorData = await questionResponse.json();
                    console.error('Failed to add question:', errorData);
                    // Continue with other questions
                }
            }

            setSuccess(true);
            setQuiz({
                title: '',
                courseId: '',
                description: '',
                duration: 30,
                maxAttempts: 1,
                questions: []
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => setSuccess(false), 2500);

        } catch (error) {
            console.error('Error creating quiz:', error);
            alert(`Error creating quiz: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-orange-100 py-10 px-2 sm:px-8 md:px-20 flex flex-col items-center">
            <motion.div
                className="w-full max-w-3xl bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl p-8 sm:p-12 border border-blue-100 animate-fadeInUp"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
            >
                <motion.h2
                    className="text-3xl sm:text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-blue-500 mb-8 drop-shadow-lg animate-pulse flex items-center justify-center gap-2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7 }}
                >
                    <span role="img" aria-label="Create Quiz">➕</span> Create New Quiz
                </motion.h2>
                {success && (
                    <motion.div className="mb-6 animate-fade-in p-4 rounded-lg bg-orange-100 border border-orange-300 text-orange-800 text-center font-semibold flex items-center justify-center gap-2 shadow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }}>
                        <span role="img" aria-label="Success">🎉</span> Quiz saved successfully!
                    </motion.div>
                )}
                {!isInstructorLoggedIn ? (
                    <motion.div className="text-center py-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }}>
                        <div className="mb-6 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg px-4 py-3 text-center font-semibold shadow">
                            Please login as an instructor to create quizzes.
                        </div>
                        <button
                            onClick={() => window.location.href = '/instructor'}
                            className="bg-gradient-to-r from-[#988913] to-[#7d7310] hover:from-[#7d7310] hover:to-[#988913] text-white font-semibold py-2 px-4 rounded-lg shadow hover:shadow-lg hover:shadow-[#988913]/25 transition-all duration-200"
                        >
                            Go to Instructor Login
                        </button>
                    </motion.div>
                ) : (
                    <>
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                                <label className="block text-base font-semibold text-orange-900 mb-2">Select Course <span className="text-red-500">*</span></label>
                                {loading ? (
                                    <div className="text-orange-700">Loading courses...</div>
                                ) : courses.length === 0 ? (
                                    <div className="text-red-700">
                                        No courses found. You need to create a course first before creating quizzes.
                                        <br />
                                        <a href="/create-course" className="text-blue-600 hover:underline mt-2 inline-block">
                                            → Create a new course
                                        </a>
                                    </div>
                                ) : (
                                    <select
                                        name="courseId"
                                        value={quiz.courseId}
                                        onChange={(e) => setQuiz({ ...quiz, courseId: e.target.value })}
                                        required
                                        className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                        disabled={saving}
                                    >
                                        <option value="">Select a course...</option>
                                        {courses.map((course) => (
                                            <option key={course.id || course._id} value={course.id || course._id}>
                                                {course.title}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                                <label className="block text-base font-semibold text-orange-900 mb-2">Quiz Title <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Quiz Title"
                                    value={quiz.title}
                                    onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                                    required
                                    className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                    disabled={saving}
                                />
                            </div>
                            <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                                <label className="block text-base font-semibold text-orange-900 mb-2">Description <span className="text-gray-500">(Optional)</span></label>
                                <textarea
                                    placeholder="Quiz Description"
                                    value={quiz.description}
                                    onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
                                    rows="3"
                                    className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                    disabled={saving}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                                    <label className="block text-base font-semibold text-orange-900 mb-2">Duration (Minutes) <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="300"
                                        value={quiz.duration}
                                        onChange={(e) => setQuiz({ ...quiz, duration: parseInt(e.target.value) || 30 })}
                                        className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                        disabled={saving}
                                    />
                                </div>
                                <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                                    <label className="block text-base font-semibold text-orange-900 mb-2">Max Attempts <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={quiz.maxAttempts}
                                        onChange={(e) => setQuiz({ ...quiz, maxAttempts: parseInt(e.target.value) || 1 })}
                                        className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                        disabled={saving}
                                    />
                                </div>
                            </div>
                            <div className="w-full flex items-center justify-center">
                                <div className="h-6 w-1 bg-gradient-to-b from-orange-300 to-blue-200 rounded-full opacity-60"></div>
                            </div>

                            {/* Input Method Selection */}
                            <div className="bg-blue-50 rounded-xl p-5 shadow border border-blue-100">
                                <h3 className="text-lg font-semibold text-blue-900 mb-3">How would you like to add questions?</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setInputMethod('manual')}
                                        className={`p-3 rounded-lg border-2 transition-all ${inputMethod === 'manual'
                                            ? 'border-blue-500 bg-blue-100 text-blue-800'
                                            : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                                            }`}
                                        disabled={saving || processingBulk}
                                    >
                                        <div className="text-center">
                                            <span className="text-2xl block mb-1">✏️</span>
                                            <span className="font-semibold">Manual Entry</span>
                                            <p className="text-xs mt-1">Add questions one by one</p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInputMethod('paste')}
                                        className={`p-3 rounded-lg border-2 transition-all ${inputMethod === 'paste'
                                            ? 'border-blue-500 bg-blue-100 text-blue-800'
                                            : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                                            }`}
                                        disabled={saving || processingBulk}
                                    >
                                        <div className="text-center">
                                            <span className="text-2xl block mb-1">📝</span>
                                            <span className="font-semibold">Copy & Paste</span>
                                            <p className="text-xs mt-1">Paste formatted text</p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInputMethod('pdf')}
                                        className={`p-3 rounded-lg border-2 transition-all ${inputMethod === 'pdf'
                                            ? 'border-blue-500 bg-blue-100 text-blue-800'
                                            : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                                            }`}
                                        disabled={saving || processingBulk}
                                    >
                                        <div className="text-center">
                                            <span className="text-2xl block mb-1">📄</span>
                                            <span className="font-semibold">Upload PDF</span>
                                            <p className="text-xs mt-1">Extract from PDF file</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Copy & Paste Interface */}
                            {inputMethod === 'paste' && (
                                <div className="bg-yellow-50 rounded-xl p-5 shadow border border-yellow-100">
                                    <h3 className="text-lg font-semibold text-yellow-900 mb-3">Paste Questions</h3>
                                    <div className="mb-3">
                                        <label className="block text-sm font-semibold text-yellow-800 mb-2">
                                            Format Instructions:
                                        </label>
                                        <div className="bg-yellow-100 p-3 rounded-lg text-xs text-yellow-800 mb-3">
                                            <strong>Expected Format:</strong><br />
                                            <div className="font-mono bg-white p-2 rounded mt-1 text-black">
                                                1. What is the capital of France?<br />
                                                a) London<br />
                                                b) Berlin<br />
                                                c) Paris<br />
                                                d) Madrid<br />
                                                Answer: c<br /><br />

                                                2. The Earth is flat.<br />
                                                Answer: False<br /><br />

                                                3. Complete: The sun rises in the ___<br />
                                                Answer: east<br /><br />

                                                4. Which programming language is used for web development?<br />
                                                a. JavaScript<br />
                                                b. Python<br />
                                                c. Java<br />
                                                d. C++<br />
                                                Ans: a
                                            </div>
                                            <strong className="block mt-2">Tips:</strong><br />
                                            • Questions can start with numbers (1., 2., 3. or 1, 2, 3)<br />
                                            • Options can use a), b), c), d) OR a., b., c., d.<br />
                                            • Answers can be "Answer:" or "Ans:" followed by letter or text<br />
                                            • For True/False: just write "Answer: True" or "Answer: False"<br />
                                            • For fill-in-blanks: write the complete answer after "Answer:"
                                        </div>
                                        <textarea
                                            value={bulkText}
                                            onChange={(e) => setBulkText(e.target.value)}
                                            placeholder="Paste your questions here following the format above..."
                                            rows="10"
                                            className="block w-full text-sm text-yellow-900 border border-yellow-200 rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
                                            disabled={saving || processingBulk}
                                        />
                                    </div>
                                    {questionError && <div className="text-red-500 text-sm mb-2">{questionError}</div>}
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={processBulkText}
                                            className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition-colors duration-200 text-sm"
                                            disabled={saving || processingBulk || !bulkText.trim()}
                                        >
                                            {processingBulk ? 'Processing...' : '📥 Process Questions'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setInputMethod('manual');
                                                setBulkText('');
                                                setQuestionError('');
                                            }}
                                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                                            disabled={saving || processingBulk}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PDF Upload Interface */}
                            {inputMethod === 'pdf' && (
                                <div className="bg-purple-50 rounded-xl p-5 shadow border border-purple-100">
                                    <h3 className="text-lg font-semibold text-purple-900 mb-3">Upload PDF Questions</h3>
                                    <div className="mb-3">
                                        <label className="block text-sm font-semibold text-purple-800 mb-2">
                                            Upload PDF File:
                                        </label>
                                        <div className="bg-purple-100 p-3 rounded-lg text-xs text-purple-800 mb-3">
                                            <strong>Tips:</strong><br />
                                            • PDF should contain clearly formatted questions<br />
                                            • Use numbered questions (1., 2., 3., etc.)<br />
                                            • Include options as a), b), c), d)<br />
                                            • Mark answers clearly as "Answer: a" or "Ans: a"<br />
                                            • If PDF processing fails, you can copy text and use paste option
                                        </div>
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setPdfFile(e.target.files[0])}
                                            className="block w-full text-sm text-purple-900 border border-purple-200 rounded-lg cursor-pointer bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
                                            disabled={saving || processingBulk}
                                        />
                                        {pdfFile && (
                                            <div className="mt-2 text-purple-700 text-sm font-medium flex items-center gap-2">
                                                <span role="img" aria-label="File">📎</span>
                                                {pdfFile.name} ({Math.round(pdfFile.size / 1024)} KB)
                                            </div>
                                        )}
                                    </div>
                                    {questionError && <div className="text-red-500 text-sm mb-2">{questionError}</div>}
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={processPdfFile}
                                            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition-colors duration-200 text-sm"
                                            disabled={saving || processingBulk || !pdfFile}
                                        >
                                            {processingBulk ? 'Processing...' : '📄 Extract Questions'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setInputMethod('manual');
                                                setPdfFile(null);
                                                setQuestionError('');
                                            }}
                                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                                            disabled={saving || processingBulk}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Manual Add Question Section */}
                            {inputMethod === 'manual' && (
                                <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                                    <h3 className="text-lg font-semibold text-orange-900 mb-3">Add Question</h3>
                                    <div className="mb-3">
                                        <label className="block text-base font-semibold text-orange-900 mb-1">Question <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            name="text"
                                            value={question.text}
                                            onChange={handleQuestionChange}
                                            className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                            placeholder="Type your question..."
                                            disabled={saving}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="block text-base font-semibold text-orange-900 mb-1">Type <span className="text-red-500">*</span></label>
                                        <select
                                            name="type"
                                            value={question.type}
                                            onChange={handleQuestionChange}
                                            className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                            disabled={saving}
                                        >
                                            <option value="mcq">MCQ</option>
                                            <option value="boolean">True/False</option>
                                            <option value="fill">Fill in the Blank</option>
                                        </select>
                                    </div>
                                    {question.type === 'mcq' && (
                                        <div className="mb-3">
                                            <label className="block text-base font-semibold text-orange-900 mb-1">Options <span className="text-red-500">*</span></label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {question.options.map((opt, idx) => (
                                                    <input
                                                        key={idx}
                                                        type="text"
                                                        name={`option${idx}`}
                                                        value={opt}
                                                        onChange={handleQuestionChange}
                                                        className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                                        placeholder={`Option ${idx + 1}`}
                                                        disabled={saving}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="mb-3">
                                        <label className="block text-base font-semibold text-orange-900 mb-1">Correct Answer <span className="text-red-500">*</span></label>
                                        {question.type === 'mcq' && (
                                            <select
                                                name="answer"
                                                value={question.answer}
                                                onChange={handleQuestionChange}
                                                className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                                disabled={saving}
                                            >
                                                <option value="">-- Select Correct Option --</option>
                                                {question.options.map((opt, idx) => (
                                                    <option key={idx} value={opt}>{opt ? opt : `Option ${idx + 1}`}</option>
                                                ))}
                                            </select>
                                        )}
                                        {question.type === 'boolean' && (
                                            <select
                                                name="answer"
                                                value={question.answer}
                                                onChange={handleQuestionChange}
                                                className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                                disabled={saving}
                                            >
                                                <option value="">-- Select --</option>
                                                <option value="True">True</option>
                                                <option value="False">False</option>
                                            </select>
                                        )}
                                        {question.type === 'fill' && (
                                            <input
                                                type="text"
                                                name="answer"
                                                value={question.answer}
                                                onChange={handleQuestionChange}
                                                className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                                placeholder="Type correct answer..."
                                                disabled={saving}
                                            />
                                        )}
                                    </div>
                                    {questionError && <div className="text-red-500 text-sm mb-2">{questionError}</div>}
                                    <button
                                        onClick={handleAddQuestion}
                                        className="bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition-colors duration-200 text-base mt-2"
                                        type="button"
                                        disabled={saving}
                                    >
                                        ➕ Add Question
                                    </button>
                                </div>
                            )}

                            {/* List of Added Questions */}
                            {quiz.questions.length > 0 && (
                                <div className="bg-orange-50 rounded-xl p-5 shadow border border-orange-100">
                                    <h3 className="text-lg font-semibold text-orange-900 mb-3">Questions Added</h3>
                                    <ul className="space-y-3">
                                        {quiz.questions.map((q, idx) => (
                                            <li key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white rounded-lg p-3 border border-orange-100 shadow-sm">
                                                <div>
                                                    <span className="font-semibold text-orange-800">Q{idx + 1}:</span> {q.text}
                                                    <span className="ml-2 text-xs text-gray-500">[{q.type.toUpperCase()}]</span>
                                                    <div className="text-xs text-gray-600 mt-1">
                                                        {q.type === 'mcq' && (
                                                            <>
                                                                Options: {q.options.join(', ')}<br />
                                                                Correct: <span className="text-orange-700 font-semibold">{q.answer}</span>
                                                            </>
                                                        )}
                                                        {q.type === 'boolean' && (
                                                            <>Correct: <span className="text-orange-700 font-semibold">{q.answer}</span></>
                                                        )}
                                                        {q.type === 'fill' && (
                                                            <>Correct: <span className="text-orange-700 font-semibold">{q.answer}</span></>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveQuestion(idx)}
                                                    className="mt-2 sm:mt-0 bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 text-xs font-semibold"
                                                    disabled={saving}
                                                >
                                                    Remove
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                type="submit"
                                className={`w-full bg-gradient-to-r from-[#988913] to-[#7d7310] hover:from-[#7d7310] hover:to-[#988913] text-white font-semibold py-3 px-6 rounded-lg shadow hover:shadow-lg hover:shadow-[#988913]/25 transition-all duration-200 text-lg flex items-center gap-2 justify-center ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                                disabled={saving}
                            >
                                <span role="img" aria-label="Save">💾</span> {saving ? 'Saving...' : 'Save Quiz'}
                            </button>


                        </form>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default CreateQuiz;
