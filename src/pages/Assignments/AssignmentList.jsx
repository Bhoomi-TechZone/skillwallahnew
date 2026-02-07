import { Link } from 'react-router-dom';

const assignments = [
    { id: 1, title: 'React Project', deadline: '2025-07-30', status: 'Pending', marks: null },
    { id: 2, title: 'Python Analysis', deadline: '2025-08-01', status: 'Submitted', marks: 18 },
];

const AssignmentList = () => (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
        <div className="w-full max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-orange-800 mb-10 drop-shadow-lg flex items-center justify-center gap-2">
                <span role="img" aria-label="Assignments">📚</span> Assignments
            </h2>
            <div className="space-y-8">
                {assignments.map((a) => (
                    <div
                        key={a.id}
                        className="bg-white border border-orange-100 p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-2xl transition-shadow duration-300"
                    >
                        <div className="flex-1">
                            <h3 className="text-xl font-semibold text-orange-900 mb-2">{a.title}</h3>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-gray-600 text-sm">
                                <span className="inline-flex items-center gap-1">
                                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="font-medium">Deadline:</span> <span>{a.deadline}</span>
                                </span>
                                <span className={`inline-flex items-center gap-1 ${a.status === 'Pending' ? 'text-yellow-600' : 'text-orange-600'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    <span className="font-medium">Status:</span> <span>{a.status}</span>
                                </span>
                                {a.status === 'Submitted' && a.marks !== null && (
                                    <span className="inline-flex items-center gap-1 text-blue-700">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor">{a.marks}</text></svg>
                                        <span className="font-medium">Marks:</span> <span>{a.marks} / 20</span>
                                    </span>
                                )}
                            </div>
                        </div>
                        {a.status === 'Pending' && (
                            <Link
                                to={`/assignments/submit/${a.id}`}
                                className="mt-2 sm:mt-0 sm:ml-4 inline-block bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition-colors duration-200 text-center"
                            >
                                Submit
                            </Link>
                        )}
                        {a.status === 'Submitted' && (
                            <span className="mt-2 sm:mt-0 sm:ml-4 inline-block bg-orange-100 text-orange-700 font-semibold px-6 py-2 rounded-lg text-center cursor-default border border-orange-200">
                                Submitted
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export default AssignmentList;
