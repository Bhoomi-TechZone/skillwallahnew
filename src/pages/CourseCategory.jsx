const categories = [
  {
    id: 1,
    name: 'Spoken English',
    description: 'Improve your fluency, pronunciation, and confidence in speaking English.',
    color: 'from-orange-400 to-blue-500',
  },
  {
    id: 2,
    name: 'English Grammar',
    description: 'Master grammar rules, sentence structure, and writing skills.',
    color: 'from-pink-400 to-purple-500',
  },
  {
    id: 3,
    name: 'IELTS & TOEFL Preparation',
    description: 'Get ready for international English exams with expert guidance.',
    color: 'from-yellow-400 to-orange-500',
  },
  {
    id: 4,
    name: 'Business English',
    description: 'Learn professional communication, email writing, and presentation skills.',
    color: 'from-blue-400 to-indigo-500',
  },
];

import { useState } from 'react';

const details = {
  1: {
    title: 'Spoken English',
    content: 'This course helps you improve your spoken English skills, including fluency, pronunciation, and confidence. Includes interactive sessions, role plays, and real-life scenarios.'
  },
  2: {
    title: 'English Grammar',
    content: 'Master grammar rules, sentence structure, and writing skills. Covers tenses, parts of speech, punctuation, and error correction with practical exercises.'
  },
  3: {
    title: 'IELTS & TOEFL Preparation',
    content: 'Comprehensive training for international English exams. Includes mock tests, tips for reading, writing, listening, and speaking modules, and personalized feedback.'
  },
  4: {
    title: 'Business English',
    content: 'Learn professional communication, email writing, presentation skills, and business vocabulary. Practice meetings, negotiations, and workplace scenarios.'
  }
};

const CourseCategory = () => {
  const [selected, setSelected] = useState(null);

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center py-0 px-2 sm:px-6 lg:px-12">
      {/* Hero Section with background image and four glassmorphic cards */}
      <div className="relative w-full h-auto min-h-[420px] flex flex-col items-center justify-center mb-16">
        <img src="/public/bg-courses.jpg" alt="background" className="absolute inset-0 w-full h-full object-cover object-center opacity-80 z-0" />
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/80 via-blue-100/80 to-pink-100/80 z-10" />
        <div className="relative z-20 w-full max-w-5xl flex flex-col items-center justify-center h-full px-2 sm:px-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-center text-orange-800 mb-8 drop-shadow-lg">🏷️ Course Categories</h2>
          <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 w-full">
            {categories.map(cat => (
              <div
                key={cat.id}
                className="backdrop-blur-md bg-white/40 border border-white/40 shadow-2xl p-4 sm:p-6 rounded-2xl flex flex-col items-center hover:scale-105 hover:bg-white/60 transition-all duration-300 text-gray-900 glassmorphism min-w-0"
                style={{boxShadow:'0 8px 32px 0 rgba(31,38,135,0.18)'}}
                onClick={() => setSelected(cat.id)}
                aria-label={`View details for ${cat.name}`}
              >
                <h3 className="text-lg sm:text-xl font-bold mb-2 drop-shadow text-orange-800 text-center">{cat.name}</h3>
                <p className="text-xs sm:text-sm opacity-90 text-gray-700 text-center">{cat.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Modal for details */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative animate-fade-in">
              <button
                className="absolute top-3 right-3 text-orange-700 hover:text-orange-900 text-2xl font-bold focus:outline-none"
                onClick={() => setSelected(null)}
                aria-label="Close details"
              >
                &times;
              </button>
              <h3 className="text-2xl font-bold text-orange-800 mb-4">{details[selected].title}</h3>
              <p className="text-gray-700 text-base mb-2">{details[selected].content}</p>
              <div className="mt-4 flex justify-end">
                <button
                  className="bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold py-2 px-5 rounded-lg shadow transition-colors duration-200"
                  onClick={() => setSelected(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 1: Learning Flowchart */}
      <div className="w-full max-w-5xl mx-auto mt-16 mb-12 z-10">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-center text-blue-700 mb-8">🚦 Your English Learning Journey</h3>
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          <div className="flex flex-col items-center">
            <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center text-3xl font-bold shadow-lg mb-2 animate-bounce">1</div>
            <div className="font-bold text-orange-800">Choose Category</div>
            <div className="text-gray-600 text-center text-sm">Pick the course category that fits your goal.</div>
          </div>
          <div className="w-10 h-1 bg-gradient-to-r from-orange-400 to-blue-400 rounded-full hidden md:block animate-pulse" />
          <div className="flex flex-col items-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center text-3xl font-bold shadow-lg mb-2 animate-bounce">2</div>
            <div className="font-bold text-blue-800">Explore Courses</div>
            <div className="text-gray-600 text-center text-sm">See all available courses and details.</div>
          </div>
          <div className="w-10 h-1 bg-gradient-to-r from-blue-400 to-yellow-400 rounded-full hidden md:block animate-pulse" />
          <div className="flex flex-col items-center">
            <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center text-3xl font-bold shadow-lg mb-2 animate-bounce">3</div>
            <div className="font-bold text-yellow-800">Enroll & Learn</div>
            <div className="text-gray-600 text-center text-sm">Register, join classes, and start learning!</div>
          </div>
        </div>
      </div>

      {/* Section 2: Timeline of Progress */}
      <div className="w-full max-w-5xl mx-auto mb-12 z-10">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-center text-purple-700 mb-8">📈 Your Progress Timeline</h3>
        <div className="relative flex flex-col items-center">
          <div className="absolute left-1/2 top-0 h-full w-1 bg-gradient-to-b from-purple-400 to-pink-400 opacity-30" style={{transform:'translateX(-50%)'}}></div>
          <div className="flex flex-col gap-12 w-full">
            <div className="flex items-center gap-6 w-full">
              <div className="flex-1 text-right pr-8">
                <div className="text-lg font-bold text-purple-800">Start with Basics</div>
                <div className="text-md text-gray-600 mt-1">Begin with foundational lessons in your chosen category.</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-2xl shadow-lg">🔤</div>
              <div className="flex-1" />
            </div>
            <div className="flex items-center gap-6 w-full flex-row-reverse">
              <div className="flex-1 text-left pl-8">
                <div className="text-lg font-bold text-pink-800">Practice & Apply</div>
                <div className="text-md text-gray-600 mt-1">Interactive exercises, quizzes, and real-life scenarios.</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-2xl shadow-lg">📝</div>
              <div className="flex-1" />
            </div>
            <div className="flex items-center gap-6 w-full">
              <div className="flex-1 text-right pr-8">
                <div className="text-lg font-bold text-purple-800">Get Feedback</div>
                <div className="text-md text-gray-600 mt-1">Personalized feedback from expert instructors.</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-2xl shadow-lg">💬</div>
              <div className="flex-1" />
            </div>
            <div className="flex items-center gap-6 w-full flex-row-reverse">
              <div className="flex-1 text-left pl-8">
                <div className="text-lg font-bold text-pink-800">Achieve & Certify</div>
                <div className="text-md text-gray-600 mt-1">Complete your course and earn a certificate!</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-2xl shadow-lg">🏅</div>
              <div className="flex-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Feature Highlights (static, more attractive) */}
      <div className="w-full max-w-5xl mx-auto mb-12 z-10">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-center text-orange-700 mb-8">✨ Why Our Categories Stand Out</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="bg-gradient-to-br from-orange-100 to-blue-100 rounded-2xl shadow-lg p-6 flex flex-col items-center text-center border-t-4 border-orange-400">
            <div className="text-4xl mb-2">👩‍🏫</div>
            <div className="font-bold text-orange-800">Expert Teachers</div>
            <div className="text-gray-600 text-sm">All categories are led by certified, experienced instructors.</div>
          </div>
          <div className="bg-gradient-to-br from-blue-100 to-orange-100 rounded-2xl shadow-lg p-6 flex flex-col items-center text-center border-t-4 border-blue-400">
            <div className="text-4xl mb-2">🕒</div>
            <div className="font-bold text-blue-800">Flexible Timing</div>
            <div className="text-gray-600 text-sm">Learn at your own pace, with live and recorded options.</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-100 to-pink-100 rounded-2xl shadow-lg p-6 flex flex-col items-center text-center border-t-4 border-yellow-400">
            <div className="text-4xl mb-2">🎯</div>
            <div className="font-bold text-yellow-800">Goal-Oriented</div>
            <div className="text-gray-600 text-sm">Each category is designed for real-world results and certification.</div>
          </div>
          <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl shadow-lg p-6 flex flex-col items-center text-center border-t-4 border-pink-400">
            <div className="text-4xl mb-2">🌏</div>
            <div className="font-bold text-pink-800">Global Community</div>
            <div className="text-gray-600 text-sm">Join learners from 25+ countries and grow your network.</div>
          </div>
        </div>
      </div>

      {/* Section 4: Fun Facts & Stats (static, more attractive) */}
      <div className="w-full max-w-5xl mx-auto mb-12 z-10">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-center text-yellow-700 mb-8">📊 Fun Facts & Stats</h3>
        <div className="flex flex-wrap items-center justify-center gap-10">
          <div className="bg-gradient-to-br from-yellow-100 to-pink-100 rounded-2xl shadow-xl p-8 flex flex-col items-center text-center">
            <div className="text-5xl mb-2">📚</div>
            <div className="font-bold text-yellow-800 text-lg">20+ Categories</div>
            <div className="text-gray-600 text-center">Covering all aspects of English learning.</div>
          </div>
          <div className="bg-gradient-to-br from-orange-100 to-blue-100 rounded-2xl shadow-xl p-8 flex flex-col items-center text-center">
            <div className="text-5xl mb-2">🏆</div>
            <div className="font-bold text-orange-800 text-lg">95% Success Rate</div>
            <div className="text-gray-600 text-center">Students achieve their learning goals.</div>
          </div>
          <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl shadow-xl p-8 flex flex-col items-center text-center">
            <div className="text-5xl mb-2">💬</div>
            <div className="font-bold text-pink-800 text-lg">1M+ Conversations</div>
            <div className="text-gray-600 text-center">Practice with peers and teachers.</div>
          </div>
          <div className="bg-gradient-to-br from-blue-100 to-orange-100 rounded-2xl shadow-xl p-8 flex flex-col items-center text-center">
            <div className="text-5xl mb-2">🎉</div>
            <div className="font-bold text-blue-800 text-lg">100+ Events</div>
            <div className="text-gray-600 text-center">Workshops, webinars, and competitions.</div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CourseCategory;
