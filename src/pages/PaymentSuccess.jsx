import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const PaymentSuccess = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [paymentData, setPaymentData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get payment data from localStorage
        const lastPayment = localStorage.getItem('lastPayment');
        if (lastPayment) {
            try {
                const parsedPayment = JSON.parse(lastPayment);
                setPaymentData(parsedPayment);
            } catch (error) {
                console.error('Error parsing payment data:', error);
            }
        }
        setLoading(false);
    }, [courseId]);

    const handleGoToCourse = () => {
        if (paymentData?.courseId) {
            navigate(`/course/${paymentData.courseId}`);
        } else {
            navigate('/my-courses');
        }
    };

    const handleGoToDashboard = () => {
        navigate('/student-dashboard');
    };

    const handleDownloadReceipt = () => {
        if (paymentData) {
            const receiptData = `
PAYMENT RECEIPT
===============

Course: ${paymentData.course?.title}
Amount: ₹${paymentData.course?.price}
Payment ID: ${paymentData.paymentId}
Date: ${new Date(paymentData.timestamp).toLocaleDateString()}
Time: ${new Date(paymentData.timestamp).toLocaleTimeString()}

Thank you for your purchase!
Yunus LMS
            `;
            
            const blob = new Blob([receiptData], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `receipt_${paymentData.paymentId}.txt`;
            a.click();
            window.URL.revokeObjectURL(url);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading payment details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Success Header */}
                <div className="text-center mb-8">
                    <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-orange-100 mb-4">
                        <svg className="h-10 w-10 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful! 🎉</h1>
                    <p className="text-lg text-gray-600">Your course enrollment has been confirmed</p>
                </div>

                {paymentData ? (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        {/* Payment Details */}
                        <div className="px-6 py-4 bg-orange-50 border-b border-orange-200">
                            <h2 className="text-xl font-semibold text-orange-800">Payment Details</h2>
                        </div>
                        
                        <div className="px-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Course Information */}
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-3">Course Information</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Course:</span>
                                            <span className="font-medium">{paymentData.course?.title}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Instructor:</span>
                                            <span className="font-medium">{paymentData.course?.instructor}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Amount:</span>
                                            <span className="font-medium text-orange-600">₹{paymentData.course?.price}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Information */}
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Information</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Payment ID:</span>
                                            <span className="font-medium font-mono text-sm">{paymentData.paymentId}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Date:</span>
                                            <span className="font-medium">
                                                {new Date(paymentData.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Time:</span>
                                            <span className="font-medium">
                                                {new Date(paymentData.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Status:</span>
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                                Completed
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Next Steps */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900 mb-3">What's Next?</h3>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center">
                                    <svg className="h-4 w-4 text-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    You now have access to the course content
                                </div>
                                <div className="flex items-center">
                                    <svg className="h-4 w-4 text-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Check your email for course access details
                                </div>
                                <div className="flex items-center">
                                    <svg className="h-4 w-4 text-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Start learning immediately from your dashboard
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="px-6 py-4 bg-white border-t border-gray-200">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={handleGoToCourse}
                                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                >
                                    Access Course
                                </button>
                                <button
                                    onClick={handleGoToDashboard}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                >
                                    Go to Dashboard
                                </button>
                                <button
                                    onClick={handleDownloadReceipt}
                                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                >
                                    Download Receipt
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Details Not Found</h2>
                        <p className="text-gray-600 mb-6">
                            We couldn't find the payment details for this transaction. 
                            Please check your email for confirmation or contact support.
                        </p>
                        <button
                            onClick={handleGoToDashboard}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                )}

                {/* Support Information */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-600">
                        Need help? Contact our support team at{' '}
                        <a href="mailto:support@yunuslms.com" className="text-blue-600 hover:text-blue-800">
                            support@yunuslms.com
                        </a>
                        {' '}or call{' '}
                        <a href="tel:+911234567890" className="text-blue-600 hover:text-blue-800">
                            +91 12345 67890
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
