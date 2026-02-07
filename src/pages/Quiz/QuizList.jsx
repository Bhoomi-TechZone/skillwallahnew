import { Link } from 'react-router-dom';

const quizzes = [
    { id: 1, title: 'React Basics', attempts: 2, maxAttempts: 3 },
    { id: 2, title: 'Python Logic', attempts: 0, maxAttempts: 1 },
];

const userRole = 'student'; // or 'instructor'

const QuizList = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
            <div className="w-full max-w-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-3xl sm:text-4xl font-bold text-orange-800 flex items-center gap-2 drop-shadow-lg w-full text-center sm:text-left sm:justify-start justify-center">
                        <span role="img" aria-label="Quizzes">📋</span> Available Quizzes
                    </h2>
                    {userRole === 'instructor' && (
                        <Link
                            to="/create-quiz"
                            className="inline-block bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition-colors duration-200 text-center"
                        >
                            + Create Quiz
                        </Link>
                    )}
                </div>
                <div className="w-full flex items-center justify-center mb-10">
                    <div className="h-1 w-24 bg-gradient-to-r from-orange-300 to-blue-200 rounded-full opacity-60"></div>
                </div>
                <div className="space-y-8">
                    {quizzes.length === 0 ? (
                        <div className="bg-white border border-orange-100 p-8 rounded-2xl shadow-lg text-center text-orange-700 font-semibold text-lg">
                            No quizzes available at the moment.
                        </div>
                    ) : (
                        quizzes.map((quiz) => (
                            <div
                                key={quiz.id}
                                className="bg-white border border-orange-100 p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-2xl transition-shadow duration-300"
                            >
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold text-orange-900 mb-1 transition-colors duration-200 hover:text-blue-700 cursor-pointer">
                                        {quiz.title}
                                    </h3>
                                    <p className="text-gray-600 text-sm">Attempts: <span className="font-medium">{quiz.attempts}</span>/{quiz.maxAttempts}</p>
                                </div>
                                <div className="flex gap-3 flex-wrap">
                                    <Link
                                        to={`/quiz/${quiz.id}`}
                                        className="bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow transition-colors duration-200 text-center"
                                    >
                                        Take Quiz
                                    </Link>
                                    <Link
                                        to="/quiz-result"
                                        className="bg-orange-50 hover:bg-orange-100 text-orange-800 font-semibold px-5 py-2 rounded-lg shadow transition-colors duration-200 text-center border border-orange-200"
                                    >
                                        View Results
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuizList;
