import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BrowseCourse = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openId, setOpenId] = useState(null);
    const [showRegistration, setShowRegistration] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isLogin, setIsLogin] = useState(false);
    const [registrationData, setRegistrationData] = useState({
        name: '',
        email: '',
        phone: '',
        password: ''
    });
    const [loginData, setLoginData] = useState({
        email: '',
        password: ''
    });
    const navigate = useNavigate();

    // Function to fetch instructor name by ID
    const fetchInstructorName = async (instructorId) => {
        try {
            const token = localStorage.getItem('adminToken') || localStorage.getItem('instructorToken') || localStorage.getItem('authToken');
            if (!token) return 'TBA';

            const response = await fetch(`http://localhost:4000/admin/users/instructor`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                const instructor = data.users?.find(inst => inst._id === instructorId);
                return instructor ? (instructor.name || instructor.email?.split('@')[0] || 'TBA') : 'TBA';
            }
        } catch (error) {
            console.error('Error fetching instructor name:', error);
        }
        return 'TBA';
    };

    // Function to map course titles to appropriate images
    const getCourseImage = (title, index) => {
        const titleLower = title.toLowerCase();

        if (titleLower.includes('spoken') || titleLower.includes('speaking')) {
            return '/se.jpg';
        } else if (titleLower.includes('grammar')) {
            return '/eg.jpg';
        } else if (titleLower.includes('ielts')) {
            return '/iel.jpg';
        } else if (titleLower.includes('business')) {
            return '/be.jpg';
        } else if (titleLower.includes('kids') || titleLower.includes('children')) {
            return '/ek.jpg';
        } else {
            // Cycle through available images for other courses
            const images = ['/se.jpg', '/eg.jpg', '/iel.jpg', '/be.jpg', '/ek.jpg'];
            return images[index % images.length];
        }
    };

    // Handle login form submission
    const handleLogin = async (e) => {
        e.preventDefault();

        // Basic validation
        if (!loginData.email || !loginData.password) {
            alert('Please fill in all fields');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(loginData.email)) {
            alert('Please enter a valid email address');
            return;
        }

        try {
            console.log('Sending login data:', { email: loginData.email, password: '***' });

            const data = await apiRequest('/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    email: loginData.email.trim().toLowerCase(), // Normalize email
                    password: loginData.password
                })
            });
            console.log('Login response headers:', response.headers);

            const responseText = await response.text();
            console.log('Login raw response:', responseText);

            if (response.ok) {
                const data = JSON.parse(responseText);
                console.log('Login success data:', data);

                // Decode JWT token to get user information
                try {
                    const token = data.access_token || data.token;
                    if (token) {
                        // Decode the JWT payload (basic decode without verification)
                        const tokenParts = token.split('.');
                        if (tokenParts.length === 3) {
                            const payload = JSON.parse(atob(tokenParts[1]));
                            console.log('Token payload:', payload);

                            // Store user data in localStorage
                            localStorage.setItem('userName', payload.name || loginData.email.split('@')[0]);
                            localStorage.setItem('userEmail', payload.email || loginData.email);
                            localStorage.setItem('authToken', token);
                        } else {
                            // Fallback if token can't be decoded
                            localStorage.setItem('userName', loginData.email.split('@')[0]);
                            localStorage.setItem('userEmail', loginData.email);
                            localStorage.setItem('authToken', token);
                        }
                    }
                } catch (decodeError) {
                    console.error('Error decoding token:', decodeError);
                    // Fallback storage
                    localStorage.setItem('userName', loginData.email.split('@')[0]);
                    localStorage.setItem('userEmail', loginData.email);
                    localStorage.setItem('authToken', data.access_token || data.token || '');
                }

                alert('Login successful!');

                // Close modal and proceed to payment
                setShowRegistration(false);
                handlePayment(selectedCourse);

            } else {
                let errorData;
                try {
                    errorData = JSON.parse(responseText);
                } catch (parseError) {
                    errorData = { message: responseText };
                }
                console.error('Login error response:', errorData);

                // Show helpful error message
                if (response.status === 401 && errorData.detail === "Invalid credentials") {
                    alert(`Login failed: Invalid email or password.\n\nTip: Try using these test credentials:\nEmail: test@example.com\nPassword: testpass123\n\nOr register as a new user first.`);
                } else {
                    alert(errorData.detail || errorData.message || `Login failed. Status: ${response.status}`);
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    };

    // Handle registration form submission
    const handleRegistration = async (e) => {
        e.preventDefault();

        // Basic validation
        if (!registrationData.name || !registrationData.email || !registrationData.phone || !registrationData.password) {
            alert('Please fill in all fields');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(registrationData.email)) {
            alert('Please enter a valid email address');
            return;
        }

        // Phone validation
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(registrationData.phone)) {
            alert('Please enter a valid 10-digit phone number');
            return;
        }

        // Password validation
        if (registrationData.password.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        try {
            // Register student
            console.log('Sending registration data:', registrationData);

            const response = await fetch('http://localhost:4000/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: registrationData.name,
                    email: registrationData.email,
                    phone: registrationData.phone,
                    password: registrationData.password,
                    role: 'student'
                }),
            });

            console.log('Registration response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Registration success data:', data);

                // Store user data in localStorage
                localStorage.setItem('userName', registrationData.name);
                localStorage.setItem('userEmail', registrationData.email);
                localStorage.setItem('userPhone', registrationData.phone);
                localStorage.setItem('authToken', data.access_token || data.token || '');

                alert('Registration successful!');

                // Close registration modal and proceed to payment
                setShowRegistration(false);
                handlePayment(selectedCourse);

            } else {
                const errorData = await response.json();
                console.error('Registration error response:', errorData);
                alert(errorData.detail || errorData.message || 'Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Registration failed. Please try again.');
        }
    };

    // Handle purchase button click - show registration first
    const handlePurchaseClick = (course) => {
        setSelectedCourse(course);
        setShowRegistration(true);
    };

    // Razorpay payment integration
    const handlePayment = async (course) => {
        try {
            // Load Razorpay script
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            document.body.appendChild(script);

            script.onload = () => {
                const options = {
                    key: 'rzp_test_XVcY6tInnHQ0Eh', // Replace with your Razorpay test key
                    amount: course.price * 100, // Amount in paise
                    currency: 'INR',
                    name: 'English Class Pvt Ltd',
                    description: `Payment for ${course.title}`,
                    image: '/logo.png', // Your company logo
                    handler: function (response) {
                        // Payment successful
                        alert(`Payment successful! Payment ID: ${response.razorpay_payment_id}`);

                        // Here you can make an API call to your backend to verify payment and enroll student
                        console.log('Payment response:', response);

                        // Navigate to course page or success page
                        navigate(`/course/${course.id}`);
                    },
                    prefill: {
                        name: localStorage.getItem('userName') || '',
                        email: localStorage.getItem('userEmail') || '',
                        contact: localStorage.getItem('userPhone') || ''
                    },
                    notes: {
                        course_id: course.id,
                        course_title: course.title
                    },
                    theme: {
                        color: '#10B981' // orange color matching your theme
                    },
                    modal: {
                        ondismiss: function () {
                            console.log('Payment modal closed');
                        }
                    }
                };

                const rzp = new window.Razorpay(options);
                rzp.open();
            };

            script.onerror = () => {
                alert('Failed to load Razorpay script');
            };

        } catch (error) {
            console.error('Payment error:', error);
            alert('Payment failed. Please try again.');
        }
    };

    // Static fallback data in case API fails
    const getStaticCourses = () => [
        {
            id: 1,
            title: 'Spoken English Mastery',
            instructor: 'Ms. Johnson',
            price: 799,
            thumbnail: '/se.jpg',
            details: 'Improve your spoken English with interactive sessions, pronunciation practice, and real-life conversations.'
        },
        {
            id: 2,
            title: 'English Grammar Essentials',
            instructor: 'Mr. Smith',
            price: 699,
            thumbnail: '/eg.jpg',
            details: 'Master English grammar rules, sentence structure, tenses, and error correction.'
        },
        {
            id: 3,
            title: 'IELTS Preparation',
            instructor: 'Ms. Patel',
            price: 999,
            thumbnail: '/iel.jpg',
            details: 'Comprehensive IELTS training including reading, writing, listening, and speaking modules.'
        },
        {
            id: 4,
            title: 'Business English Communication',
            instructor: 'Mr. Brown',
            price: 899,
            thumbnail: '/be.jpg',
            details: 'Learn business vocabulary, email writing, presentations, and professional communication skills.'
        },
        {
            id: 5,
            title: 'English for Kids',
            instructor: 'Ms. orange',
            price: 599,
            thumbnail: '/ek.jpg',
            details: 'Fun and engaging English lessons for children, including stories, games, and activities.'
        }
    ];

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                // Fixed API URL - removed '/api' prefix to match backend routing
                const response = await fetch('http://localhost:4000/course/');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                console.log('Raw course data from backend:', data);

                // Transform backend data to match expected frontend structure
                const transformedCourses = await Promise.all(data.map(async (course, index) => {
                    let instructorName = course.instructor_name || 'TBA';

                    // If instructor_name is not available but instructor ID is, fetch the name
                    if (!course.instructor_name && course.instructor && course.instructor.length === 24) {
                        console.log('Fetching instructor name for ID:', course.instructor);
                        instructorName = await fetchInstructorName(course.instructor);
                    } else if (!course.instructor_name && course.instructor) {
                        // If instructor field doesn't look like an ID, use it as is
                        instructorName = course.instructor;
                    }

                    return {
                        id: course._id || course.id || index + 1,
                        title: course.title || course.name || 'Untitled Course',
                        instructor: instructorName,
                        price: course.price || 0,
                        thumbnail: getCourseImage(course.title || course.name || '', index),
                        details: course.description || course.summary || 'No description available'
                    };
                }));

                setCourses(transformedCourses);
            } catch (error) {
                console.error('Failed to fetch courses:', error);
                // Fallback to static courses if API fails
                setCourses(getStaticCourses());
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-blue-100">
                <motion.div
                    className="w-20 h-20 border-8 border-orange-300 border-t-orange-600 rounded-full animate-spin mb-6"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
                <div className="text-orange-700 text-2xl font-bold animate-pulse">Loading courses...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex flex-col items-center justify-start">
            {/* Hero Section */}
            <div className="w-full max-w-6xl mb-10">
                <motion.h2
                    className="text-4xl sm:text-5xl font-extrabold text-center text-orange-800 mb-4 drop-shadow-xl"
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 100 }}
                >
                    📚 English Class Pvt Ltd - Browse English Courses
                </motion.h2>
                <p className="text-center text-lg text-orange-700 mb-6 animate-fadeIn">Find the perfect course to boost your English skills!</p>
            </div>

            {/* Popular Courses Section - Animated Carousel */}
            <div className="w-full max-w-6xl mb-12">
                <h3 className="text-3xl font-extrabold text-center text-orange-700 mb-8">🔥 Popular Courses</h3>
                <div className="relative overflow-x-auto whitespace-nowrap py-4" style={{ scrollbarWidth: 'none' }}>
                    <div className="flex gap-8 animate-scroll-x" style={{ animation: 'scroll-x 30s linear infinite' }}>
                        {courses.concat(courses).map((course, idx) => {
                            const expanded = openId === course.id;
                            return (
                                <motion.div
                                    key={course.id + '-' + idx}
                                    animate={{ height: expanded ? 480 : 320 }}
                                    className={`relative min-w-[320px] max-w-[340px] mx-2 rounded-2xl shadow-xl overflow-hidden group border-2 border-orange-200 bg-white/80 flex flex-col justify-end transition-all duration-500 ${expanded ? 'z-20' : ''}`}
                                    whileHover={{ scale: 1.04 }}
                                >
                                    <img
                                        src={course.thumbnail}
                                        alt={course.title}
                                        className="absolute inset-0 w-full h-full object-cover object-center opacity-80 group-hover:scale-110 transition-transform duration-500 z-0"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-orange-900/70 via-transparent to-blue-200/10 z-10" />
                                    <div className="relative z-20 flex flex-col h-full justify-end p-5">
                                        <div className="text-xl font-bold text-white mb-1 drop-shadow flex items-center gap-2">
                                            <span className="text-yellow-300 animate-bounce">★</span> {course.title}
                                        </div>
                                        <div className="text-xs text-orange-100 mb-1 drop-shadow">Instructor: <span className="font-semibold text-yellow-200">{course.instructor}</span></div>
                                        <div className="text-xs text-orange-100 mb-2 drop-shadow">Price: <span className="font-semibold text-yellow-200">₹{course.price}</span></div>
                                        <div className="flex flex-col gap-2 mt-2">
                                            <button
                                                onClick={() => navigate(`/course-details/${course.id}`)}
                                                className="inline-block bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold py-1.5 px-3 rounded-lg shadow transition-colors duration-200 text-center text-sm"
                                            >
                                                View Details
                                            </button>
                                            <button
                                                onClick={() => handlePurchaseClick(course)}
                                                className="inline-block bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-semibold py-1.5 px-3 rounded-lg shadow transition-colors duration-200 text-center text-sm"
                                            >
                                                Purchase
                                            </button>
                                        </div>
                                        {expanded && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="mt-3 p-3 bg-orange-50/90 border border-orange-200 rounded-xl text-gray-800 text-sm shadow-inner text-left"
                                                style={{ whiteSpace: 'pre-line' }}
                                            >
                                                <strong>Course Details:</strong>
                                                <br />
                                                {course.details && course.details.length > 0
                                                    ? course.details
                                                    : 'No additional details available.'}
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
                {/* Carousel animation keyframes */}
                <style>{`
                    @keyframes scroll-x {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                `}</style>
            </div>

            {/* Why Choose Us Section - Timeline Style */}
            <div className="w-full max-w-6xl mb-12">
                <h3 className="text-3xl font-extrabold text-center text-orange-700 mb-8">🌟 Why Choose Us?</h3>
                <div className="relative flex flex-col items-center">
                    <div className="absolute left-1/2 top-0 h-full w-1 bg-gradient-to-b from-orange-400 to-blue-400 opacity-30" style={{ transform: 'translateX(-50%)' }}></div>
                    <div className="flex flex-col gap-12 w-full">
                        <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-6 w-full">
                            <div className="flex-1 text-right pr-8">
                                <div className="text-2xl font-bold text-orange-800">Expert Instructors</div>
                                <div className="text-md text-gray-600 mt-1">Learn from certified and experienced teachers.</div>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-3xl shadow-lg">👩‍🏫</div>
                            <div className="flex-1" />
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-6 w-full flex-row-reverse">
                            <div className="flex-1 text-left pl-8">
                                <div className="text-2xl font-bold text-orange-800">Interactive Learning</div>
                                <div className="text-md text-gray-600 mt-1">Engaging lessons, quizzes, and real-life practice.</div>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-3xl shadow-lg">💡</div>
                            <div className="flex-1" />
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="flex items-center gap-6 w-full">
                            <div className="flex-1 text-right pr-8">
                                <div className="text-2xl font-bold text-orange-800">Certification</div>
                                <div className="text-md text-gray-600 mt-1">Get recognized certificates after course completion.</div>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-3xl shadow-lg">🏆</div>
                            <div className="flex-1" />
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="flex items-center gap-6 w-full flex-row-reverse">
                            <div className="flex-1 text-left pl-8">
                                <div className="text-2xl font-bold text-orange-800">Flexible Schedule</div>
                                <div className="text-md text-gray-600 mt-1">Learn at your own pace, anytime, anywhere.</div>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-3xl shadow-lg">⏱️</div>
                            <div className="flex-1" />
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Testimonials Section */}
            <div className="w-full max-w-6xl mb-12">
                <h3 className="text-3xl font-extrabold text-center text-orange-700 mb-8">💬 What Our Students Say</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    <motion.div className="bg-white/90 rounded-xl shadow p-6 flex flex-col items-center text-center" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <span className="text-3xl mb-2">😊</span>
                        <div className="font-bold text-orange-800 mb-1">"Amazing experience!"</div>
                        <div className="text-sm text-gray-600">The courses are interactive and the teachers are very supportive. My English improved a lot!<br /><span className="font-semibold text-orange-700">- Priya S.</span></div>
                    </motion.div>
                    <motion.div className="bg-white/90 rounded-xl shadow p-6 flex flex-col items-center text-center" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <span className="text-3xl mb-2">🌟</span>
                        <div className="font-bold text-orange-800 mb-1">"Best English platform!"</div>
                        <div className="text-sm text-gray-600">Loved the flexible schedule and practical lessons. Highly recommend!<br /><span className="font-semibold text-orange-700">- Rahul K.</span></div>
                    </motion.div>
                    <motion.div className="bg-white/90 rounded-xl shadow p-6 flex flex-col items-center text-center" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <span className="text-3xl mb-2">🏅</span>
                        <div className="font-bold text-orange-800 mb-1">"Got my certificate!"</div>
                        <div className="text-sm text-gray-600">The certification helped me in my job search. Thank you!<br /><span className="font-semibold text-orange-700">- Sneha M.</span></div>
                    </motion.div>
                </div>
            </div>
            {/* How It Works Section - Animated */}
            <div className="w-full max-w-6xl mb-12">
                <h3 className="text-3xl font-extrabold text-center text-orange-700 mb-8">🚀 How It Works</h3>
                <div className="flex flex-col md:flex-row items-center justify-center gap-10">
                    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col items-center">
                        <div className="text-5xl mb-2">🔍</div>
                        <div className="font-bold text-orange-800">Browse</div>
                        <div className="text-gray-600 text-center">Explore a variety of English courses for all levels.</div>
                    </motion.div>
                    <div className="w-10 h-1 bg-gradient-to-r from-orange-400 to-blue-400 rounded-full hidden md:block" />
                    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center">
                        <div className="text-5xl mb-2">📝</div>
                        <div className="font-bold text-orange-800">Register</div>
                        <div className="text-gray-600 text-center">Sign up easily and get instant access to course material.</div>
                    </motion.div>
                    <div className="w-10 h-1 bg-gradient-to-r from-orange-400 to-blue-400 rounded-full hidden md:block" />
                    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center">
                        <div className="text-5xl mb-2">🎓</div>
                        <div className="font-bold text-orange-800">Learn & Succeed</div>
                        <div className="text-gray-600 text-center">Attend classes, complete quizzes, and earn certificates.</div>
                    </motion.div>
                </div>
            </div>

            {/* Our Achievements Section - Cards */}
            <div className="w-full max-w-6xl mb-12">
                <h3 className="text-3xl font-extrabold text-center text-orange-700 mb-8">🏅 Our Achievements</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center text-center border-t-4 border-orange-400">
                        <div className="text-4xl mb-2">👨‍🎓</div>
                        <div className="font-bold text-orange-800 text-lg">10,000+ Students</div>
                        <div className="text-gray-600 text-center">Successfully trained and certified.</div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center text-center border-t-4 border-blue-400">
                        <div className="text-4xl mb-2">🌍</div>
                        <div className="font-bold text-orange-800 text-lg">25+ Countries</div>
                        <div className="text-gray-600 text-center">Global reach and diverse community.</div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center text-center border-t-4 border-yellow-400">
                        <div className="text-4xl mb-2">⭐</div>
                        <div className="font-bold text-orange-800 text-lg">4.9/5 Rating</div>
                        <div className="text-gray-600 text-center">Average student satisfaction score.</div>
                    </motion.div>
                </div>
            </div>

            {/* Student Registration/Login Modal */}
            {showRegistration && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-orange-800">
                                {isLogin ? 'Student Login' : 'Student Registration'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowRegistration(false);
                                    setIsLogin(false);
                                }}
                                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                            >
                                ×
                            </button>
                        </div>
                        {selectedCourse && (
                            <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                <p className="text-sm text-orange-700">
                                    <strong>Course:</strong> {selectedCourse.title}
                                </p>
                                <p className="text-sm text-orange-700">
                                    <strong>Price:</strong> ₹{selectedCourse.price}
                                </p>
                            </div>
                        )}
                        {/* Toggle between Login and Register */}
                        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setIsLogin(false)}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${!isLogin
                                    ? 'bg-white text-orange-700 shadow'
                                    : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                Register
                            </button>
                            <button
                                onClick={() => setIsLogin(true)}
                                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${isLogin
                                    ? 'bg-white text-orange-700 shadow'
                                    : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                Login
                            </button>
                        </div>

                        {isLogin ? (
                            // Login Form
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-xs text-blue-600">
                                        <strong>Test Credentials:</strong><br />
                                        Email: test@example.com<br />
                                        Password: testpass123
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        value={loginData.email}
                                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="Enter your email address"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Password *
                                    </label>
                                    <input
                                        type="password"
                                        value={loginData.password}
                                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="Enter your password"
                                        required
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowRegistration(false);
                                            setIsLogin(false);
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white rounded-lg transition-colors duration-200"
                                    >
                                        Login & Pay
                                    </button>
                                </div>
                            </form>
                        ) : (
                            // Registration Form
                            <form onSubmit={handleRegistration} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={registrationData.name}
                                        onChange={(e) => setRegistrationData({ ...registrationData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="Enter your full name"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        value={registrationData.email}
                                        onChange={(e) => setRegistrationData({ ...registrationData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="Enter your email address"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        value={registrationData.phone}
                                        onChange={(e) => setRegistrationData({ ...registrationData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="Enter 10-digit phone number"
                                        maxLength="10"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Password *
                                    </label>
                                    <input
                                        type="password"
                                        value={registrationData.password}
                                        onChange={(e) => setRegistrationData({ ...registrationData, password: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="Enter password (min 6 characters)"
                                        minLength="6"
                                        required
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowRegistration(false);
                                            setIsLogin(false);
                                        }}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white rounded-lg transition-colors duration-200"
                                    >
                                        Register & Pay
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BrowseCourse;
