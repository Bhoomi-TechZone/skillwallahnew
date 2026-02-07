import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';

const englishQuestions = [
    {
        q: "Which of the following is a synonym for 'beautiful'?",
        icon: "💐",
        options: ["Ugly", "Gorgeous", "Plain", "Boring"],
        answer: "Gorgeous",
    },
    {
        q: "What is the past tense of 'run'?",
        icon: "🏃‍♂️",
        options: ["Runned", "Running", "Ran", "Runs"],
        answer: "Ran",
    },
    {
        q: "Choose the correct sentence:",
        icon: "✍️",
        options: ["She don't like coffee", "She doesn't like coffee", "She not like coffee", "She no like coffee"],
        answer: "She doesn't like coffee",
    },
    {
        q: "Which word is an antonym of 'brave'?",
        icon: "🦁",
        options: ["Courageous", "Bold", "Coward", "Fearless"],
        answer: "Coward",
    },
    {
        q: "What type of word is 'quickly'?",
        icon: "⚡",
        options: ["Noun", "Verb", "Adjective", "Adverb"],
        answer: "Adverb",
    },
    {
        q: "Choose the correct plural form of 'child':",
        icon: "👶",
        options: ["Childs", "Children", "Childes", "Childrens"],
        answer: "Children",
    },
    {
        q: "Which sentence uses correct punctuation?",
        icon: "✒️",
        options: ["Hello how are you", "Hello, how are you?", "Hello how are you.", "Hello; how are you"],
        answer: "Hello, how are you?",
    },
    {
        q: "What is the comparative form of 'good'?",
        icon: "📈",
        options: ["Gooder", "More good", "Better", "Best"],
        answer: "Better",
    },
    {
        q: "Choose the correct use of 'their', 'there', or 'they're':",
        icon: "🧑‍🤝‍🧑",
        options: ["Their going to the park", "There going to the park", "They're going to the park", "Theyr going to the park"],
        answer: "They're going to the park",
    },
    {
        q: "Which word means 'a person who writes books'?",
        icon: "📚",
        options: ["Reader", "Author", "Editor", "Publisher"],
        answer: "Author",
    }
];

const Check = () => {
    const [answers, setAnswers] = useState({});
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [currentQ, setCurrentQ] = useState(0);
    const questionRefs = useRef([]);

    const handleChange = (qIndex, value) => {
        setAnswers({ ...answers, [qIndex]: value });
    };

    // Scroll to next question with animation
    const goToNextQuestion = (idx) => {
        if (idx < englishQuestions.length - 1) {
            setCurrentQ(idx + 1);
            setTimeout(() => {
                if (questionRefs.current[idx + 1]) {
                    questionRefs.current[idx + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    };

    const handleSubmit = () => {
        // Calculate score
        let correct = 0;
        englishQuestions.forEach((q, i) => {
            if (answers[i] && answers[i].trim() === q.answer.trim()) correct++;
        });
        setScore(correct);
        setShowResult(true);
        
        // Scroll to top when results are shown
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (showResult) {
        const percent = (score / englishQuestions.length) * 100;
        let summaryMsg = '';
        let summaryColor = '';
        let level = '';
        let barColor = '';
        if (percent === 100) {
            summaryMsg = 'Perfect score! 🎉 Your English is excellent!';
            summaryColor = 'text-orange-700';
            level = 'Expert';
            barColor = 'bg-orange-500';
        } else if (percent >= 80) {
            summaryMsg = 'Great job! 👏 You have advanced English skills!';
            summaryColor = 'text-orange-600';
            level = 'Advanced';
            barColor = 'bg-blue-500';
        } else if (percent >= 60) {
            summaryMsg = 'Good work! 👍 You have intermediate English skills!';
            summaryColor = 'text-yellow-600';
            level = 'Intermediate';
            barColor = 'bg-yellow-400';
        } else if (percent >= 40) {
            summaryMsg = 'Keep practicing! 📚 You have basic English skills!';
            summaryColor = 'text-orange-600';
            level = 'Basic';
            barColor = 'bg-orange-400';
        } else {
            summaryMsg = "Don't give up! 💪 Keep learning and try again!";
            summaryColor = 'text-red-600';
            level = 'Beginner';
            barColor = 'bg-red-500';
        }
        return (
            <div className="min-h-screen relative flex items-center justify-center py-8 md:py-16" style={{backgroundImage: "url('/pic6.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat'}}>
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/80 via-blue-100/80 to-orange-100/80 backdrop-blur-[2px] z-0"></div>
                <motion.div className="w-full max-w-xl bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border-2 border-yellow-200 relative z-10"
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                >
                    <motion.h2 className="text-4xl sm:text-5xl font-extrabold text-center text-yellow-700 mb-10 drop-shadow-xl animate-pulse flex items-center justify-center gap-2"
                        initial={{ y: -40, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                    >
                        <span role="img" aria-label="trophy" className="animate-bounce">🏆</span> English Quiz Results
                    </motion.h2>
                    {/* Level Graph */}
                    <div className="mb-6">
                        <div className="font-semibold text-lg text-center mb-2">Your English Level: <span className={`px-3 py-1 rounded-full font-bold ${barColor} text-white`}>{level}</span></div>
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
                        <motion.div className="bg-yellow-50/80 rounded-xl p-5 shadow border border-yellow-100 flex flex-col sm:flex-row sm:items-center sm:justify-between animate-fadeInUp2"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7 }}
                        >
                            <div className="text-lg font-semibold text-yellow-900">English Level Check</div>
                            <div className="text-base text-blue-700 font-bold">{score} / {englishQuestions.length}</div>
                            <div className="text-xs text-gray-500 mt-1 sm:mt-0">{new Date().toLocaleDateString()}</div>
                        </motion.div>
                        <div className={`text-center text-lg font-semibold ${summaryColor}`}>{summaryMsg}</div>
                        <div className="w-full flex items-center justify-center my-2">
                            <div className="h-1 w-24 bg-gradient-to-r from-yellow-300 to-blue-200 rounded-full opacity-60"></div>
                        </div>
                        <div className="space-y-6">
                            {englishQuestions.map((q, i) => {
                                const userAns = answers[i] || '';
                                const isCorrect = userAns.trim() === q.answer.trim();
                                return (
                                    <motion.div 
                                        key={i} 
                                        className={`rounded-xl p-5 shadow border flex flex-col gap-2 ${isCorrect ? 'bg-orange-50/80 border-orange-200' : 'bg-red-50/80 border-red-200'} animate-fadeInUp2`}
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.7 + i * 0.1 }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{q.icon}</span>
                                            <span className={`text-xl ${isCorrect ? 'text-orange-600' : 'text-red-500'}`}>{isCorrect ? '✔️' : '❌'}</span>
                                            <span className="font-semibold text-lg text-gray-900">{i + 1}. {q.q}</span>
                                        </div>
                                        <div className="ml-7">
                                            <span className="font-medium">Your answer:</span> 
                                            <span className={isCorrect ? 'text-orange-700' : 'text-red-700'}>{userAns || <span className="italic text-gray-400">No answer</span>}</span>
                                        </div>
                                        {!isCorrect && (
                                            <div className="ml-7 text-sm text-blue-700">
                                                Correct answer: <span className="font-semibold">{q.answer}</span>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                        <div className="mt-8 text-center">
                            <button
                                onClick={() => {
                                    setShowResult(false);
                                    setAnswers({});
                                    setScore(0);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="bg-gradient-to-r from-yellow-500 to-blue-600 hover:from-yellow-600 hover:to-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow transition-colors duration-200 text-lg"
                            >
                                Take Quiz Again
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Check if all questions are answered
    const allAnswered = englishQuestions.every((_, i) => answers[i] && answers[i].toString().trim() !== '');

    return (
        <div className="min-h-screen relative flex items-center justify-center py-8 md:py-16" style={{backgroundImage: "url('/pic6.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat'}}>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/80 via-blue-100/80 to-yellow-100/80 backdrop-blur-[2px] z-0"></div>
            <motion.div
                className="w-full max-w-2xl bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-orange-100 relative z-10"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
            >
                <motion.div className="mb-8" initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
                    <h2 className="text-2xl font-bold text-center text-orange-700 mb-2 animate-pulse">Check Your English Level</h2>
                    <div className="text-center text-sm text-gray-500 mt-2">Levels are determined by your quiz score after submission.</div>
                </motion.div>
                <motion.h2 className="text-3xl sm:text-4xl font-bold text-center text-orange-800 mb-8 drop-shadow-lg animate-pulse" initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
                    📝 English Level Test
                </motion.h2>
                <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
                    <div className="space-y-8">
                        {englishQuestions.map((q, i) => (
                            <AnimatePresence key={i}>
                                <motion.div
                                    ref={el => questionRefs.current[i] = el}
                                    className={`bg-orange-50/90 rounded-xl p-5 shadow border border-orange-100 animate-fadeInUp2 transition-all duration-300 ${currentQ === i ? 'ring-2 ring-blue-400 scale-[1.03]' : ''}`}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 30 }}
                                    transition={{ duration: 0.7 + i * 0.1 }}
                                    whileHover={{ scale: 1.04, boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.18)" }}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-2xl">{q.icon}</span>
                                        <p className="font-semibold text-lg text-orange-900">
                                            {i + 1}. {q.q}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2 mt-2">
                                        {q.options.map((opt, idx) => (
                                            <label key={idx} className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name={`q${i}`}
                                                    value={opt}
                                                    checked={answers[i] === opt}
                                                    onChange={() => {
                                                        handleChange(i, opt);
                                                        goToNextQuestion(i);
                                                    }}
                                                    className="accent-orange-600"
                                                />
                                                <span className="transition-colors duration-200 group-hover:text-blue-700">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {i < englishQuestions.length - 1 && (
                                        <div className="w-full flex items-center justify-center mt-6">
                                            <div className="h-1 w-16 bg-gradient-to-r from-orange-200 to-blue-100 rounded-full opacity-50"></div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        ))}
                    </div>
                    <button
                        type="submit"
                        className={`mt-8 w-full bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow transition-colors duration-200 text-lg ${!allAnswered ? 'opacity-60 cursor-not-allowed' : ''}`}
                        disabled={!allAnswered}
                    >
                        Submit Quiz & Check My Level
                    </button>
                    {!allAnswered && (
                        <p className="text-center text-sm text-gray-500 mt-2">
                            Please answer all questions to submit the quiz
                        </p>
                    )}
                </form>
            </motion.div>
        </div>
    );
};

export default Check;
