import React from 'react';

const Earnings = () => {
    // Sample data
    const earningsData = {
        totalEarnings: 25000,
        totalCourses: 12,
        totalStudents: 430,
        payouts: [
            { date: '2025-07-01', amount: 5000 },
            { date: '2025-06-01', amount: 7000 },
            { date: '2025-05-01', amount: 6000 },
        ],
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">💰 My Earnings</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-orange-100 text-orange-800 p-4 rounded shadow">
                    <h2 className="text-lg font-semibold">Total Earnings</h2>
                    <p className="text-2xl font-bold">₹{earningsData.totalEarnings}</p>
                </div>
                <div className="bg-blue-100 text-blue-800 p-4 rounded shadow">
                    <h2 className="text-lg font-semibold">Courses Published</h2>
                    <p className="text-2xl font-bold">{earningsData.totalCourses}</p>
                </div>
                <div className="bg-yellow-100 text-yellow-800 p-4 rounded shadow">
                    <h2 className="text-lg font-semibold">Students Enrolled</h2>
                    <p className="text-2xl font-bold">{earningsData.totalStudents}</p>
                </div>
            </div>

            <h2 className="text-xl font-bold mb-3">📄 Recent Payouts</h2>
            <div className="bg-white shadow rounded p-4 overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b">
                            <th className="p-2">Date</th>
                            <th className="p-2">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {earningsData.payouts.map((payout, index) => (
                            <tr key={`payout-${payout.date}-${index}`} className="border-b hover:bg-gray-50">
                                <td className="p-2">{payout.date}</td>
                                <td className="p-2">₹{payout.amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Earnings;
