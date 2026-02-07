// Payment Service for Stripe and Razorpay Integration
import { loadStripe } from '@stripe/stripe-js';

const STRIPE_PUBLISHABLE_KEY = 'pk_test_51SFXW41YNfcQMqtN14uJ2rN9qwVGwFH0FKXhf1uwagw9Vm0jhLUlyHscNW299IHOD4zSnv90iQZmIZ5fbXx1cB2T00pGFqfuCj';
const RAZORPAY_KEY_ID = 'rzp_test_R7vr1NPWxZnHX7'; // Real Razorpay key from backend
const API_BASE_URL = 'http://localhost:4000';

// Initialize Stripe
let stripePromise;
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

// Load Razorpay script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

class PaymentService {
  // Get Authorization header
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Create Stripe checkout session
  async createCheckoutSession(courseId, amount, currency = 'USD', courseName = '') {
    try {
      console.log('🔄 Creating Stripe checkout session:', { courseId, amount, currency });

      const response = await fetch(`${API_BASE_URL}/create-checkout-session/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          course_id: courseId,
          amount: amount,
          currency: currency,
          course_name: courseName
        })
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Checkout session created:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creating checkout session:', error);
      throw error;
    }
  }

  // Redirect to Stripe Checkout
  async redirectToCheckout(sessionId) {
    try {
      console.log('🔄 Redirecting to Stripe checkout:', sessionId);
      const stripe = await getStripe();

      const { error } = await stripe.redirectToCheckout({
        sessionId: sessionId
      });

      if (error) {
        console.error('❌ Stripe redirect error:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Error redirecting to checkout:', error);
      throw error;
    }
  }

  // Verify Stripe payment after success
  async verifyStripePayment(sessionId, courseId) {
    try {
      const studentId = this.getStudentId();
      const studentProfile = this.getStudentProfile();

      console.log('🔄 Verifying Stripe payment:', { sessionId, courseId, studentId });

      const response = await fetch(`${API_BASE_URL}/verify-stripe-payment/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          session_id: sessionId,
          course_id: courseId,
          student_id: studentId,
          student_name: studentProfile.name || 'Unknown Student'
        })
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('❌ Verification error response:', errorData);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Payment verified successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error verifying payment:', error);
      throw error;
    }
  }

  // Enroll in free course
  async enrollFreeCourse(courseId, studentId) {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/enroll-free-course/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          course_id: courseId,
          student_id: studentId
        })
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error enrolling in free course:', error);
      throw error;
    }
  }

  // Get student ID from localStorage or auth
  getStudentId() {
    // Try to get from localStorage first
    const studentData = localStorage.getItem('studentAuth');
    if (studentData) {
      try {
        const parsed = JSON.parse(studentData);
        return parsed.student?.id || parsed.student?._id || parsed.id || parsed._id;
      } catch (error) {
        console.error('Error parsing student data:', error);
      }
    }

    // Fallback to user data
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        return parsed.id || parsed._id || parsed.userId;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

    console.warn('Student ID not found in localStorage');
    return null;
  }

  // Get student profile for prefill
  getStudentProfile() {
    const studentData = localStorage.getItem('studentAuth') || localStorage.getItem('user');
    if (studentData) {
      try {
        const parsed = JSON.parse(studentData);
        const student = parsed.student || parsed;
        return {
          name: student.name || student.fullName || '',
          email: student.email || '',
          contact: student.phone || student.mobile || ''
        };
      } catch (error) {
        console.error('Error parsing student profile:', error);
      }
    }
    return {
      name: '',
      email: '',
      contact: ''
    };
  }

  // Format amount for display
  formatAmount(amount) {
    return parseFloat(amount).toFixed(2);
  }

  // Get Stripe publishable key
  getStripePublishableKey() {
    return STRIPE_PUBLISHABLE_KEY;
  }

  // Create Razorpay order
  async createRazorpayOrder(courseId, amount, currency = 'INR', courseName = '') {
    try {
      console.log('🔄 Creating Razorpay order:', { courseId, amount, currency });

      const studentProfile = this.getStudentProfile();

      const response = await fetch(`${API_BASE_URL}/payments/enroll-course/init`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          course_id: courseId,
          amount: amount,
          currency: currency,
          provider: 'razorpay',
          student_name: studentProfile.name || 'Student',
          student_email: studentProfile.email || '',
          student_phone: studentProfile.contact || ''
        })
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Razorpay order created:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creating Razorpay order:', error);
      throw error;
    }
  }

  // Process Razorpay payment
  async processRazorpayPayment(course) {
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load');
      }

      const studentProfile = this.getStudentProfile();
      const amount = parseFloat(course.price);
      const courseId = course.id || course._id || course.courseId || course.course_id;

      // Create Razorpay order
      const orderData = await this.createRazorpayOrder(
        courseId,
        amount,
        'INR',
        course.title
      );

      return new Promise((resolve, reject) => {
        const options = {
          key: orderData.razorpay_key_id,
          amount: Math.round(amount * 100), // Amount in paise
          currency: orderData.currency,
          name: 'SkillWallah EdTech',
          description: `Enrollment for ${course.title}`,
          order_id: orderData.razorpay_order_id,
          image: '/logo.png', // Your company logo
          handler: async (response) => {
            try {
              console.log('✅ Razorpay payment successful:', response);

              // Verify payment on backend
              const verificationResult = await this.verifyRazorpayPayment(
                orderData.enrollment_id,
                response.razorpay_order_id,
                response.razorpay_payment_id,
                response.razorpay_signature
              );

              if (verificationResult.status === 'success') {
                resolve({
                  success: true,
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                  courseId: courseId,
                  courseTitle: course.title
                });
              } else {
                reject(new Error('Payment verification failed'));
              }
            } catch (error) {
              console.error('❌ Error verifying Razorpay payment:', error);
              reject(error);
            }
          },
          prefill: {
            name: studentProfile.name,
            email: studentProfile.email,
            contact: studentProfile.contact
          },
          theme: {
            color: '#1e3a8a' // Your brand color
          },
          modal: {
            ondismiss: () => {
              reject(new Error('Payment cancelled by user'));
            }
          }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      });
    } catch (error) {
      console.error('❌ Error processing Razorpay payment:', error);
      throw error;
    }
  }

  // Verify Razorpay payment
  async verifyRazorpayPayment(enrollmentId, orderId, paymentId, signature) {
    try {
      console.log('🔄 Verifying Razorpay payment:', { enrollmentId, orderId, paymentId });

      const response = await fetch(`${API_BASE_URL}/payments/enroll-course/verify`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          enrollment_id: enrollmentId,
          order_id: orderId,
          payment_id: paymentId,
          signature: signature
        })
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('❌ Verification error response:', errorData);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Razorpay payment verified successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error verifying Razorpay payment:', error);
      throw error;
    }
  }

  // Get Razorpay key
  getRazorpayKeyId() {
    return RAZORPAY_KEY_ID;
  }

  // Get enrolled courses for the current student
  async getEnrolledCourses() {
    try {
      const studentId = this.getStudentId();
      if (!studentId) {
        console.log('No student ID found, returning empty courses array');
        return [];
      }

      // Try the new student endpoint first
      try {
        const response = await fetch(`${API_BASE_URL}/student/enrolled-courses/${studentId}`, {
          method: 'GET',
          headers: this.getAuthHeaders()
        });

        if (response.ok) {
          const data = await response.json();
          return Array.isArray(data) ? data : (data.courses || data.enrolledCourses || []);
        }
      } catch (error) {
        console.log('Student endpoint failed, trying authenticated endpoint:', error.message);
      }

      // Fallback to authenticated endpoint
      const response = await fetch(`${API_BASE_URL}/enrollment/my-courses`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated, returning empty courses array');
          return [];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.courses || data.enrolledCourses || data || [];
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      // Return empty array if there's an error to prevent UI crashes
      return [];
    }
  }
}

export default new PaymentService();