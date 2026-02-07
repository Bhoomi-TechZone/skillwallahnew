import { useState } from 'react';

const FAQ = () => {
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (index) => {
    setOpenItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const faqCategories = [
    {
      title: "Getting Started",
      icon: "🚀",
      questions: [
        {
          question: "How do I create an account on Younus LMS?",
          answer: "Creating an account is simple! Click the 'Sign Up' button on our homepage, fill in your basic information including name, email, and password. You'll receive a verification email to activate your account. Once verified, you can start exploring our courses immediately."
        },
        {
          question: "Is there a free trial available?",
          answer: "Yes! We offer a 7-day free trial for new users. During this period, you can access selected courses, use our learning tools, and explore the platform features. No credit card is required for the trial period."
        },
        {
          question: "What devices can I use to access Younus LMS?",
          answer: "Younus LMS is fully responsive and works on all devices including desktop computers, laptops, tablets, and smartphones. We also have mobile apps available for iOS and Android for learning on the go."
        }
      ]
    },
    {
      title: "Courses & Learning",
      icon: "📚",
      questions: [
        {
          question: "How many courses can I enroll in simultaneously?",
          answer: "With our Premium plan, you can enroll in unlimited courses simultaneously. Basic plan users can enroll in up to 3 courses at a time. You can always upgrade your plan to access more courses."
        },
        {
          question: "Are the courses self-paced or do they have specific schedules?",
          answer: "Most of our courses are self-paced, allowing you to learn at your own convenience. However, we also offer instructor-led courses with specific schedules and live sessions. Check the course details for specific information."
        },
        {
          question: "What happens if I don't complete a course within the given time?",
          answer: "Don't worry! Once you enroll in a course, you have lifetime access to the content. You can complete it at your own pace without any time restrictions. Your progress is automatically saved."
        },
        {
          question: "Can I download course materials for offline viewing?",
          answer: "Yes! Premium subscribers can download video lectures, PDFs, and other course materials for offline access. Downloaded content is available through our mobile app even without an internet connection."
        }
      ]
    },
    {
      title: "Certificates & Assessments",
      icon: "🏆",
      questions: [
        {
          question: "Do I get a certificate after completing a course?",
          answer: "Yes! Upon successful completion of a course and passing the final assessment (if applicable), you'll receive a digital certificate. Our certificates are industry-recognized and can be shared on LinkedIn or downloaded as PDF."
        },
        {
          question: "Are there any exams or quizzes?",
          answer: "Most courses include quizzes, assignments, and assessments to test your understanding. Some courses have a final exam. All assessments are designed to reinforce learning and ensure you've mastered the concepts."
        },
        {
          question: "What is the passing criteria for courses?",
          answer: "The passing criteria varies by course, but typically you need to score 70% or higher on assessments. Some courses may require completion of all modules and assignments. Specific requirements are mentioned in each course description."
        },
        {
          question: "Can I retake quizzes and exams?",
          answer: "Yes! You can retake most quizzes and exams multiple times. However, some final assessments may have a limit on the number of attempts. Check the specific course guidelines for detailed information."
        }
      ]
    },
    {
      title: "Payment & Pricing",
      icon: "💳",
      questions: [
        {
          question: "What payment methods do you accept?",
          answer: "We accept all major credit and debit cards (Visa, MasterCard, American Express, Discover) through Stripe. All payments are processed securely with industry-standard encryption and PCI compliance."
        },
        {
          question: "Is there a refund policy?",
          answer: "Yes! We offer a 30-day money-back guarantee. If you're not satisfied with a course within 30 days of purchase, you can request a full refund. Refunds are processed within 5-7 business days."
        },
        {
          question: "Can I upgrade or downgrade my subscription plan?",
          answer: "Absolutely! You can upgrade or downgrade your plan at any time from your account settings. Changes take effect immediately, and billing adjustments are made on your next billing cycle."
        },
        {
          question: "Do you offer discounts for students or bulk purchases?",
          answer: "Yes! We offer special discounts for students (with valid student ID), educational organizations, and corporate bulk purchases. Contact our sales team for custom pricing on bulk orders."
        }
      ]
    },
    {
      title: "Technical Support",
      icon: "🔧",
      questions: [
        {
          question: "I'm having trouble accessing my course. What should I do?",
          answer: "First, try refreshing your browser or logging out and back in. Clear your browser cache if needed. If the problem persists, contact our technical support team at support@younuslms.com or use the live chat feature."
        },
        {
          question: "The video won't load or keeps buffering. How can I fix this?",
          answer: "This is usually due to internet connectivity. Try reducing the video quality, pause and let it buffer, or switch to a more stable internet connection. You can also download the video for offline viewing if you're a Premium subscriber."
        },
        {
          question: "How do I reset my password?",
          answer: "Click on 'Forgot Password' on the login page, enter your registered email address, and you'll receive a password reset link. Follow the instructions in the email to create a new password."
        },
        {
          question: "Can I change my registered email address?",
          answer: "Yes! Go to your account settings and update your email address. You'll need to verify the new email address for security purposes. All course progress and certificates remain linked to your account."
        }
      ]
    },
    {
      title: "Instructors & Teaching",
      icon: "👨‍🏫",
      questions: [
        {
          question: "How can I become an instructor on Younus LMS?",
          answer: "We welcome expert instructors! Apply through our 'Become an Instructor' page. You'll need to provide your credentials, experience, and a sample course outline. Our team reviews applications and provides feedback within 5-7 business days."
        },
        {
          question: "What are the requirements to teach on your platform?",
          answer: "Instructors should have relevant expertise in their field, teaching experience (preferred), and the ability to create engaging content. You'll need to provide proof of qualifications and undergo our instructor training program."
        },
        {
          question: "How do instructors get paid?",
          answer: "Instructors receive a percentage of course sales based on our revenue-sharing model. Payments are made monthly via bank transfer or Stripe Connect. Detailed earnings reports are available in your instructor dashboard."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100">
      {/* Hero Section */}
      <section className="py-8 px-2 sm:px-6 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-6 sm:p-8 lg:p-12 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-orange-800 mb-6 drop-shadow-lg">
              Frequently Asked <span className="text-blue-600">Questions</span>
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-orange-300 to-blue-200 mx-auto rounded-full mb-6 opacity-60"></div>
            <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Find answers to common questions about Younus LMS. Can't find what you're looking for? 
              Contact our support team anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Search Bar */}
      <section className="py-8 px-2 sm:px-6 lg:px-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-6">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search for answers..."
                className="w-full pl-12 pr-4 py-3 sm:py-4 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none text-base sm:text-lg bg-orange-50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-8 px-2 sm:px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          {faqCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-8 lg:mb-12">
              <div className="bg-white rounded-2xl shadow-lg border border-orange-100 p-6 sm:p-8 lg:p-12">
                <div className="flex flex-col sm:flex-row items-start sm:items-center mb-6 sm:mb-8">
                  <span className="text-2xl sm:text-3xl mr-0 sm:mr-4 mb-2 sm:mb-0">{category.icon}</span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-orange-800 drop-shadow-lg">{category.title}</h2>
                </div>
                <div className="w-16 h-1 bg-gradient-to-r from-orange-300 to-blue-200 rounded-full opacity-60 mb-6"></div>
                
                <div className="space-y-4">
                  {category.questions.map((item, index) => {
                    const itemKey = `${categoryIndex}-${index}`;
                    const isOpen = openItems[itemKey];
                    
                    return (
                      <div key={index} className="bg-orange-50 rounded-xl shadow border border-orange-200 overflow-hidden hover:shadow-lg transition-shadow">
                        <button
                          onClick={() => toggleItem(itemKey)}
                          className="w-full px-4 sm:px-6 py-4 sm:py-5 text-left flex justify-between items-center hover:bg-orange-100 transition-colors focus:outline-none focus:bg-orange-100"
                        >
                          <span className="text-base sm:text-lg font-semibold text-orange-900 pr-4">
                            {item.question}
                          </span>
                          <svg
                            className={`w-5 h-5 sm:w-6 sm:h-6 text-orange-600 transform transition-transform flex-shrink-0 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {isOpen && (
                          <div className="px-4 sm:px-6 pb-4 sm:pb-5">
                            <div className="pt-2 border-t border-orange-200">
                              <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                                {item.answer}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    

   
    </div>
  );
};

export default FAQ;
