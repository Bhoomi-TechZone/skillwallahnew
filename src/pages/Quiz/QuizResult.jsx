
const QuizResult = () => {
    const results = [
        { quiz: 'Spoken English Quiz', score: '9/10', date: '2025-07-25' },
        { quiz: 'English Grammar Test', score: '8/10', date: '2025-07-26' },
        { quiz: 'IELTS Practice', score: '7/10', date: '2025-07-27' },
        { quiz: 'Business English Assessment', score: '10/10', date: '2025-07-28' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
            <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8 border border-yellow-100">
                <h2 className="text-3xl sm:text-4xl font-bold text-center text-yellow-700 mb-8 drop-shadow-lg">📊 Quiz Results</h2>
                <div className="space-y-5">
                    {results.map((res, i) => (
                        <div key={i} className="bg-yellow-50 rounded-xl p-5 shadow border border-yellow-100 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-lg font-semibold text-yellow-900">{res.quiz}</div>
                            <div className="text-base text-blue-700 font-bold">{res.score}</div>
                            <div className="text-xs text-gray-500 mt-1 sm:mt-0">{res.date}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default QuizResult;
