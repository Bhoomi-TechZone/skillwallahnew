
const ReviewAssignment = () => {
    const submissions = [
        {
            id: 1,
            student: 'Soyeb',
            fileUrl: '/submissions/soyeb_assignment1.pdf',
            submittedAt: '2025-07-24',
            marks: '',
            comments: ''
        },
        {
            id: 2,
            student: 'Soyeb',
            fileUrl: '/submissions/soyeb_assignment1.pdf',
            submittedAt: '2025-07-25',
            marks: '',
            comments: ''
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
            <div className="w-full max-w-3xl">
                <h3 className="text-3xl sm:text-4xl font-bold text-center text-orange-800 mb-10 drop-shadow-lg flex items-center justify-center gap-2">
                    <span role="img" aria-label="Review">📝</span> Review Assignments
                </h3>
                <div className="space-y-8">
                    {submissions.map(sub => (
                        <div
                            key={sub.id}
                            className="bg-white border border-orange-100 p-6 rounded-2xl shadow-lg flex flex-col gap-6 hover:shadow-2xl transition-shadow duration-300"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="text-orange-900 font-semibold text-lg">👤 {sub.student}</div>
                                <div className="text-gray-500 text-sm">Submitted: <span className="font-medium">{sub.submittedAt}</span></div>
                            </div>
                            <div>
                                <a
                                    className="inline-flex items-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-medium px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm border border-orange-200"
                                    href={sub.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <span role="img" aria-label="View File">📂</span> View File
                                </a>
                            </div>
                            <form className="flex flex-col sm:flex-row sm:items-end gap-4 mt-2">
                                <div className="flex flex-col flex-1">
                                    <label className="text-base font-semibold text-orange-900 mb-1">Marks</label>
                                    <input
                                        type="number"
                                        placeholder="Marks"
                                        className="border border-orange-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 transition w-full bg-white"
                                    />
                                </div>
                                <div className="flex flex-col flex-1">
                                    <label className="text-base font-semibold text-orange-900 mb-1">Instructor Comments</label>
                                    <textarea
                                        placeholder="Instructor Comments"
                                        className="border border-orange-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 transition w-full min-h-[40px] bg-white"
                                    ></textarea>
                                </div>
                                <button
                                    type="submit"
                                    className="bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition-colors duration-200 flex items-center gap-2"
                                >
                                    <span role="img" aria-label="Submit">✅</span> Submit Feedback
                                </button>
                            </form>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReviewAssignment;
