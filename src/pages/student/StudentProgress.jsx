import React, { useState, useEffect } from 'react';

const StudentProgress = () => {
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  const mockProgressData = {
    overview: {
      totalCourses: 8,
      completedCourses: 3,
      totalHours: 127,
      totalPoints: 1250,
      avgScore: 87,
      streak: 15
    },
    weeklyProgress: [
      { day: 'Mon', hours: 2.5, points: 85 },
      { day: 'Tue', hours: 1.8, points: 60 },
      { day: 'Wed', hours: 3.2, points: 120 },
      { day: 'Thu', hours: 2.1, points: 75 },
      { day: 'Fri', hours: 1.5, points: 45 },
      { day: 'Sat', hours: 4.0, points: 150 },
      { day: 'Sun', hours: 2.8, points: 95 }
    ],
    courseProgress: [
      {
        id: 1,
        title: "React.js Complete Course",
        progress: 75,
        totalLessons: 42,
        completedLessons: 32,
        timeSpent: 45,
        averageScore: 92,
        lastActivity: "2024-01-10",
        nextMilestone: "Advanced Hooks"
      },
      {
        id: 2,
        title: "JavaScript ES6+ Masterclass",
        progress: 45,
        totalLessons: 28,
        completedLessons: 13,
        timeSpent: 28,
        averageScore: 88,
        lastActivity: "2024-01-09",
        nextMilestone: "Async Programming"
      },
      {
        id: 3,
        title: "Node.js Backend Development",
        progress: 100,
        totalLessons: 35,
        completedLessons: 35,
        timeSpent: 55,
        averageScore: 95,
        lastActivity: "2023-12-15",
        nextMilestone: "Course Completed"
      },
      {
        id: 4,
        title: "Python for Data Science",
        progress: 30,
        totalLessons: 40,
        completedLessons: 12,
        timeSpent: 20,
        averageScore: 85,
        lastActivity: "2024-01-05",
        nextMilestone: "Data Visualization"
      }
    ],
    achievements: [
      {
        id: 1,
        title: "Quick Learner",
        description: "Complete 5 lessons in one day",
        icon: "rocket",
        progress: 100,
        unlocked: true,
        unlockedDate: "2023-12-15"
      },
      {
        id: 2,
        title: "Quiz Master",
        description: "Score 90+ on 10 quizzes",
        icon: "brain",
        progress: 80,
        unlocked: false,
        currentCount: 8,
        targetCount: 10
      },
      {
        id: 3,
        title: "Consistency King",
        description: "Study for 30 consecutive days",
        icon: "trophy",
        progress: 50,
        unlocked: false,
        currentCount: 15,
        targetCount: 30
      },
      {
        id: 4,
        title: "Course Finisher",
        description: "Complete 5 courses",
        icon: "academic-cap",
        progress: 60,
        unlocked: false,
        currentCount: 3,
        targetCount: 5
      }
    ],
    skillsProgress: [
      { skill: "JavaScript", level: "Advanced", progress: 85, courses: 3 },
      { skill: "React.js", level: "Intermediate", progress: 70, courses: 2 },
      { skill: "Node.js", level: "Advanced", progress: 90, courses: 1 },
      { skill: "Python", level: "Beginner", progress: 35, courses: 1 },
      { skill: "Data Analysis", level: "Beginner", progress: 25, courses: 1 }
    ]
  };

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setProgressData(mockProgressData);
      setLoading(false);
    }, 1000);
  }, [selectedPeriod]);

  const handleContinueCourse = (courseId) => {
    console.log(`Continue course with ID: ${courseId}`);
    // Add navigation or API call logic here (e.g., navigate to course page)
  };

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'rocket':
        return (
          <svg className="w-8 h-8 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'brain':
        return (
          <svg className="w-8 h-8 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
        );
      case 'trophy':
        return (
          <svg className="w-8 h-8 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'academic-cap':
        return (
          <svg className="w-8 h-8 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 0 1 .665 6.479A11.952 11.952 0 0 0 12 20.055a11.952 11.952 0 0 0-6.824-2.998 12.078 12.078 0 0 1 .665-6.479L12 14zm-4 6v-7.5l4-2.222" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-gray-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 bg-gradient-to-b from-gray-50 to-white min-h-screen p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between animate-slide-up">
        <h1 className="text-4xl font-extrabold text-[#0A0A0A]">Learning Progress</h1>
        <div className="mt-4 sm:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 border border-gray-100 rounded-xl text-[#0A0A0A] font-medium focus:ring-2 focus:ring-gray-600 focus:border-transparent cursor-pointer transition-all duration-200 shadow-sm"
            aria-label="Select time period for progress"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 animate-slide-up">
        {[
          { label: 'Total Courses', value: progressData?.overview?.totalCourses || 0, icon: 'book-open' },
          { label: 'Completed', value: progressData?.overview?.completedCourses || 0, icon: 'check-circle' },
          { label: 'Total Hours', value: progressData?.overview?.totalHours || 0, icon: 'clock' },
          { label: 'Total Points', value: progressData?.overview?.totalPoints || 0, icon: 'star' },
          { label: 'Avg Score', value: `${progressData?.overview?.avgScore || 0}%`, icon: 'chart-bar' },
          { label: 'Study Streak', value: progressData?.overview?.streak || 0, icon: 'fire' }
        ].map((stat, index) => (
          <div
            key={`stat-${index}`}
            className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl hover:scale-[1.03] transition-all duration-300 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 text-base">{stat.label}</p>
                <p className="text-2xl font-extrabold text-[#0A0A0A]">{stat.value}</p>
              </div>
              {getIcon(stat.icon)}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Progress Chart */}
      <div className="bg-white rounded-2xl shadow-lg p-8 animate-slide-up">
        <h3 className="text-2xl font-extrabold text-[#0A0A0A] mb-6">Weekly Activity</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {progressData?.weeklyProgress?.map((day, index) => (
            <div key={`progress-${day.day}-${index}`} className="text-center">
              <div className="text-base text-gray-700 mb-2">{day.day}</div>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2 hover:bg-gray-100 hover:scale-[1.03] transition-all duration-300 group">
                <div className="text-xl font-extrabold text-[#0A0A0A]">{day.hours}h</div>
                <div className="text-base text-gray-700">{day.points} pts</div>
                <div
                  className="bg-gray-600 rounded h-4 shadow-sm"
                  style={{ height: `${Math.min((day.hours / 4) * 40, 40)}px` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course Progress */}
      <div className="bg-white rounded-2xl shadow-lg p-8 animate-slide-up">
        <h3 className="text-2xl font-extrabold text-[#0A0A0A] mb-6">Course Progress</h3>
        <div className="space-y-6">
          {progressData?.courseProgress?.map((course) => (
            <div key={course.id} className="border border-gray-100 rounded-2xl p-6 hover:shadow-xl hover:scale-[1.03] transition-all duration-300 group">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-extrabold text-[#0A0A0A]">{course.title}</h4>
                <span className={`px-3 py-1 rounded-full text-base font-medium shadow-sm ${
                  course.progress >= 100 
                    ? 'bg-orange-100 text-orange-700' 
                    : course.progress >= 75 
                    ? 'bg-blue-100 text-blue-700'
                    : course.progress >= 50
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {course.progress >= 100 ? '✓ ' : ''}{course.progress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
                <div
                  className={`h-4 rounded-full shadow-sm transition-all duration-300 ${
                    course.progress >= 100
                      ? 'bg-gradient-to-r from-orange-400 to-orange-500 animate-pulse'
                      : course.progress >= 75
                      ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                      : course.progress >= 50
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                      : 'bg-gradient-to-r from-gray-400 to-gray-500'
                  }`}
                  style={{ width: `${course.progress}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-base mb-4">
                <div>
                  <span className="text-gray-700">Lessons:</span>
                  <span className="ml-2 font-medium text-[#0A0A0A]">{course.completedLessons}/{course.totalLessons}</span>
                </div>
                <div>
                  <span className="text-gray-700">Time Spent:</span>
                  <span className="ml-2 font-medium text-[#0A0A0A]">{course.timeSpent}h</span>
                </div>
                <div>
                  <span className="text-gray-700">Avg Score:</span>
                  <span className="ml-2 font-medium text-[#0A0A0A]">{course.averageScore}%</span>
                </div>
                <div>
                  <span className="text-gray-700">Last Activity:</span>
                  <span className="ml-2 font-medium text-[#0A0A0A]">{course.lastActivity}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-base text-gray-700">Next Milestone: </span>
                  <span className={`text-base font-medium ${
                    course.progress >= 100 ? 'text-orange-600' : 'text-[#0A0A0A]'
                  }`}>
                    {course.progress >= 100 ? '🎉 Course Completed!' : course.nextMilestone}
                  </span>
                </div>
                {course.progress < 100 ? (
                  <button
                    onClick={() => handleContinueCourse(course.id)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-[#0A0A0A] font-medium rounded-xl focus:ring-2 focus:ring-gray-600 focus:outline-none transition-all duration-200 shadow-sm"
                    aria-label={`Continue ${course.title} course`}
                  >
                    Continue Course
                  </button>
                ) : (
                  <button
                    onClick={() => handleContinueCourse(course.id)}
                    className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium rounded-xl focus:ring-2 focus:ring-orange-600 focus:outline-none transition-all duration-200 shadow-sm flex items-center space-x-2"
                    aria-label={`View ${course.title} certificate`}
                  >
                    <span>✓</span>
                    <span>View Certificate</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills Progress and Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
        {/* Skills Progress */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-extrabold text-[#0A0A0A] mb-6">Skills Development</h3>
          <div className="space-y-4">
            {progressData?.skillsProgress?.map((skill, index) => (
              <div key={`skill-progress-${skill.skill}-${index}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-[#0A0A0A]">{skill.skill}</span>
                    <span className="px-2 py-1 rounded-full text-base font-medium bg-gray-100 text-gray-800 shadow-sm">
                      {skill.level}
                    </span>
                  </div>
                  <span className="text-base text-gray-700">{skill.progress}%</span>
                </div>
                <div className="w-full bg-gray-300 rounded-full h-4">
                  <div
                    className="bg-gray-600 h-4 rounded-full shadow-sm transition-all duration-300"
                    style={{ width: `${skill.progress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-700">
                  {skill.courses} course{skill.courses > 1 ? 's' : ''} enrolled
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-extrabold text-[#0A0A0A] mb-6">Achievements</h3>
          <div className="space-y-4">
            {progressData?.achievements?.map((achievement) => (
              <div
                key={achievement.id}
                className={`border border-gray-100 rounded-2xl p-6 hover:shadow-xl hover:scale-[1.03] transition-all duration-300 group ${
                  achievement.unlocked ? 'bg-gray-50 border-l-4 border-gray-600' : 'bg-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={achievement.unlocked ? '' : 'grayscale opacity-50'}>
                    {getIcon(achievement.icon)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-extrabold text-[#0A0A0A]">{achievement.title}</h4>
                    <p className="text-base text-gray-700">{achievement.description}</p>
                    {achievement.unlocked ? (
                      <p className="text-xs text-gray-700 mt-1">
                        Unlocked on {achievement.unlockedDate}
                      </p>
                    ) : (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-700 mb-1">
                          <span>Progress</span>
                          <span>
                            {achievement.currentCount || Math.floor((achievement.progress * (achievement.targetCount || 100)) / 100)}/
                            {achievement.targetCount || 100}
                          </span>
                        </div>
                        <div className="w-full bg-gray-300 rounded-full h-4">
                          <div
                            className="bg-gray-600 h-4 rounded-full shadow-sm transition-all duration-300"
                            style={{ width: `${achievement.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProgress;