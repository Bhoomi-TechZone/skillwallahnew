import { useState } from 'react';
import QRCode from 'react-qr-code';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

const ShareCertificate = ({ certLink, title, onClose }) => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certLink)}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md text-center">
                <h2 className="text-xl font-semibold mb-4">🔗 Share on LinkedIn</h2>
                <p className="mb-3">
                    Proud to complete <strong>{title}</strong> on Bhoomi LMS!
                </p>
                <a
                    href={linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                    Share Now
                </a>
                <div className="mt-4">
                    <button className="text-sm underline text-gray-600" onClick={onClose}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};


const STUDENT_USERNAME = "soyeb";
const STUDENT_PASSWORD = "12345";

const CertificatePage = () => {
    const [showShareModal, setShowShareModal] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');

    const certificates = [
        {
            id: 1,
            title: 'Spoken English Mastery',
            issuedDate: '2025-07-25',
            templateUrl: '/certs/spoken-english-cert.pdf',
            verificationLink: 'https://englishclass.com/verify/123456',
        },
        {
            id: 2,
            title: 'English Grammar Essentials',
            issuedDate: '2025-07-20',
            templateUrl: '/certs/grammar-cert.pdf',
            verificationLink: 'https://englishclass.com/verify/789012',
        },
        {
            id: 3,
            title: 'IELTS Preparation',
            issuedDate: '2025-07-18',
            templateUrl: '/certs/ielts-cert.pdf',
            verificationLink: 'https://englishclass.com/verify/345678',
        },
        {
            id: 4,
            title: 'Business English Communication',
            issuedDate: '2025-07-15',
            templateUrl: '/certs/business-english-cert.pdf',
            verificationLink: 'https://englishclass.com/verify/901234',
        },
    ];

    const handleDownload = (url) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = url.split('/').pop();
        link.click();
    };

    const handlePrint = (url) => {
        window.open(url, '_blank');
    };

    const handleLoginChange = (e) => {
        const { name, value } = e.target;
        setLoginData({ ...loginData, [name]: value });
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (
            loginData.username === STUDENT_USERNAME &&
            loginData.password === STUDENT_PASSWORD
        ) {
            setIsLoggedIn(true);
            setLoginError('');
        } else {
            setLoginError('Invalid student credentials.');
        }
    };

    if (!isLoggedIn) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
                        <h2 className="text-3xl sm:text-4xl font-bold text-center text-orange-800 mb-8 drop-shadow-lg flex items-center justify-center gap-2">🧑‍🎓 Student Login</h2>
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-base font-semibold text-orange-900 mb-2">Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    required
                                    value={loginData.username}
                                    onChange={handleLoginChange}
                                    className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                    placeholder="Enter student username"
                                />
                            </div>
                            <div>
                                <label className="block text-base font-semibold text-orange-900 mb-2">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    value={loginData.password}
                                    onChange={handleLoginChange}
                                    className="block w-full text-base text-orange-900 border border-orange-200 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
                                    placeholder="Enter password"
                                />
                            </div>
                            {loginError && <div className="text-red-500 text-sm text-center">{loginError}</div>}
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow transition-colors duration-200 text-lg flex items-center gap-2 justify-center"
                            >
                                🔑 Login
                            </button>
                            <div className="text-xs text-gray-400 text-center mt-2">Demo: soyeb / 12345</div>
                        </form>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
                <div className="w-full max-w-5xl">
                    <h2 className="text-3xl sm:text-4xl font-bold text-center text-orange-800 mb-10 drop-shadow-lg">🎓 My Certificates</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {certificates.map((cert) => (
                            <div key={cert.id} className="bg-white border border-orange-100 p-6 rounded-2xl shadow-lg flex flex-col hover:shadow-2xl transition-shadow duration-300">
                                <h3 className="text-lg font-semibold text-orange-900 mb-1 truncate">{cert.title}</h3>
                                <p className="text-sm text-gray-600 mb-1"><span className="font-medium text-orange-700">Issued on:</span> {cert.issuedDate}</p>
                                <a href={cert.verificationLink} target="_blank" rel="noopener noreferrer" className="flex justify-center my-3">
                                    <QRCode value={cert.verificationLink} size={100} />
                                </a>
                                <div className="flex flex-wrap gap-3 mt-3">
                                    <button
                                        className="bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow transition-colors duration-200 text-center"
                                        onClick={() => handleDownload(cert.templateUrl)}
                                    >
                                        Download
                                    </button>
                                    <button
                                        className="bg-orange-100 text-orange-700 font-semibold px-5 py-2 rounded-lg text-center border border-orange-200 hover:bg-orange-200 transition-colors duration-200"
                                        onClick={() => handlePrint(cert.templateUrl)}
                                    >
                                        Print
                                    </button>
                                    <button
                                        className="bg-gray-700 text-white font-semibold px-5 py-2 rounded-lg text-center hover:bg-gray-800 transition-colors duration-200"
                                        onClick={() => setShowShareModal(cert.id)}
                                    >
                                        Share
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {showShareModal && (
                        <ShareCertificate
                            certLink={certificates.find((c) => c.id === showShareModal)?.verificationLink}
                            title={certificates.find((c) => c.id === showShareModal)?.title}
                            onClose={() => setShowShareModal(null)}
                        />
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
};

export default CertificatePage;
