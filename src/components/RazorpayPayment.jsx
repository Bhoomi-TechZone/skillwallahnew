import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const RazorpayPayment = ({ course, studentData, onSuccess, onError, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [razorpayConfig, setRazorpayConfig] = useState(null);

  // Load Razorpay script
  useEffect(() => {
    const loadRazorpayScript = () => {
      return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    const fetchRazorpayConfig = async () => {
      try {
        const response = await fetch('http://localhost:4000/payments/razorpay-config');
        if (response.ok) {
          const config = await response.json();
          setRazorpayConfig(config);
        }
      } catch (error) {
        console.error('Failed to fetch Razorpay config:', error);
      }
    };

    loadRazorpayScript().then(() => {
      fetchRazorpayConfig();
    });
  }, []);

  const initiatePayment = async () => {
    if (!razorpayConfig || loading) return;

    setLoading(true);

    try {
      // Get student info from localStorage or props
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      // Prepare enrollment payload
      const enrollmentPayload = {
        student_name: studentData.name || "Student",
        student_email: studentData.email || "student@example.com",
        student_phone: studentData.phone || "",
        amount: course.price || 0,
        course_id: course.id || course._id,
        currency: "INR",
        provider: "razorpay"
      };

      // Create enrollment order
      const response = await fetch('http://localhost:4000/payments/enroll-course/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(enrollmentPayload)
      });

      if (!response.ok) {
        throw new Error('Failed to create enrollment order');
      }

      const orderData = await response.json();

      // Razorpay payment options
      const options = {
        key: razorpayConfig.key_id,
        amount: orderData.amount * 100, // Convert to paise
        currency: orderData.currency,
        name: "SkillWallah EdTech",
        description: `Enrollment in ${course.title}`,
        image: "/public/img.jfif", // Your logo
        order_id: orderData.razorpay_order_id,
        handler: async function (response) {
          await handlePaymentSuccess(response, orderData.enrollment_id);
        },
        prefill: {
          name: enrollmentPayload.student_name,
          email: enrollmentPayload.student_email,
          contact: enrollmentPayload.student_phone
        },
        notes: {
          course_id: course.id || course._id,
          course_name: course.title
        },
        theme: {
          color: "#1e40af" // Your theme color
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            if (onClose) onClose();
          }
        }
      };

      // Open Razorpay checkout
      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Payment initiation error:', error);
      setLoading(false);
      if (onError) {
        onError('Failed to initiate payment. Please try again.');
      }
    }
  };

  const handlePaymentSuccess = async (paymentResponse, enrollmentId) => {
    try {
      // Verify payment on backend
      const verifyResponse = await fetch('http://localhost:4000/payments/enroll-course/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
          enrollment_id: enrollmentId,
          order_id: paymentResponse.razorpay_order_id,
          payment_id: paymentResponse.razorpay_payment_id,
          signature: paymentResponse.razorpay_signature
        })
      });

      if (verifyResponse.ok) {
        const result = await verifyResponse.json();
        setLoading(false);
        if (onSuccess) {
          onSuccess(result, {
            course_id: course.id || course._id,
            course_name: course.title,
            payment_id: paymentResponse.razorpay_payment_id,
            enrollment_id: enrollmentId
          });
        }
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setLoading(false);
      if (onError) {
        onError('Payment completed but verification failed. Please contact support.');
      }
    }
  };

  return (
    <div className="razorpay-payment">
      <button
        onClick={initiatePayment}
        disabled={loading || !razorpayConfig}
        className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${loading || !razorpayConfig
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transform hover:scale-105'
          }`}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing...
          </div>
        ) : (
          `Pay ₹${course.price} & Enroll Now`
        )}
      </button>
    </div>
  );
};

RazorpayPayment.propTypes = {
  course: PropTypes.object.isRequired,
  studentData: PropTypes.object.isRequired,
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
  onClose: PropTypes.func
};

export default RazorpayPayment;