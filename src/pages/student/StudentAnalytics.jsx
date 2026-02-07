import React, { useState, useEffect } from 'react';

const StudentAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  const mockAnalytics = {
    overview: {
      totalStudyTime: 127,
      coursesCompleted: 3,
      averageScore: 87,
      streakDays: 15,
      pointsEarned: 1250,
      badgesEarned: 8
    },
    studyPattern: {
      dailyAverage: 2.1,
      weeklyGoal: 10,
      bestDay: 'Saturday',
      preferredTime: '14:00-16:00',
      weeklyData: [
        { day: 'Mon', hours: 1.5, sessions: 2 },
        { day: 'Tue', hours: 2.3, sessions: 3 },
        { day: 'Wed', hours: 1.8, sessions: 2 },
        { day: 'Thu', hours: 2.7, sessions: 4 },
        { day: 'Fri', hours: 1.2, sessions: 1 },
        { day: 'Sat', hours: 4.2, sessions: 5 },
        { day: 'Sun', hours: 2.8, sessions: 3 }
      ]
    },
    performance: {
      quizScores: [
        { date: '2024-01-01', score: 85 },
        { date: '2024-01-03', score: 92 },
        { date: '2024-01-05', score: 78 },
        { date: '2024-01-08', score: 95 },
        { date: '2024-01-10', score: 88 }
      ],
      assignmentScores: [
        { date: '2024-01-02', score: 90 },
        { date: '2024-01-06', score: 87 },
        { date: '2024-01-09', score: 93 }
      ],
      improvementTrend: 'upward',
      consistencyScore: 85
    },
    courseProgress: [
      {
        course: 'React.js Complete Course',
        progress: 75,
        timeSpent: 45,
        avgScore: 92,
        completion: 'in-progress',
        color: 'blue'
      },
      {
        course: 'JavaScript ES6+ Masterclass',
        progress: 45,
        timeSpent: 28,
        avgScore: 88,
        completion: 'in-progress',
        color: 'yellow'
      },
      {
        course: 'Node.js Backend Development',
        progress: 100,
        timeSpent: 55,
        avgScore: 95,
        completion: 'completed',
        color: 'orange'
      }
    ],
    skillDevelopment: [
      { skill: 'JavaScript', startLevel: 3, currentLevel: 8, target: 9 },
      { skill: 'React', startLevel: 2, currentLevel: 7, target: 9 },
      { skill: 'Node.js', startLevel: 1, currentLevel: 8, target: 9 },
      { skill: 'Database', startLevel: 2, currentLevel: 6, target: 8 }
    ],
    learningGoals: [
      {
        id: 1,
        title: 'Complete React Course',
        target: 100,
        current: 75,
        deadline: '2024-01-20',
        type: 'course'
      },
      {
        id: 2,
        title: 'Study 10 hours per week',
        target: 10,
        current: 12.5,
        deadline: '2024-01-14',
        type: 'time'
      },
      {
        id: 3,
        title: 'Achieve 90% average score',
        target: 90,
        current: 87,
        deadline: '2024-01-31',
        type: 'score'
      }
    ],
    recommendations: [
      {
        type: 'course',
        title: 'TypeScript Fundamentals',
        reason: 'Complements your JavaScript skills',
        confidence: 95
      },
      {
        type: 'practice',
        title: 'More quiz practice',
        reason: 'Improve quiz performance',
        confidence: 88
      },
      {
        type: 'schedule',
        title: 'Morning study sessions',
        reason: 'You perform better in afternoons',
        confidence: 82
      }
    ]
  };

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setAnalyticsData(mockAnalytics);
      setLoading(false);
    }, 1000);
  }, [selectedPeriod]);

  const getProgressColor = (progress) => {
    if (progress >= 90) return 'bg-orange-500';
    if (progress >= 70) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSkillLevelColor = (level) => {
    if (level >= 8) return 'bg-orange-500';
    if (level >= 6) return 'bg-blue-500';
    if (level >= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'upward':
        return '📈';
      case 'downward':
        return '📉';
      case 'stable':
        return '➡️';
      default:
        return '📊';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Learning Analytics</h1>
        <div className="mt-4 sm:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Study Time</p>
              <p className="text-3xl font-bold">{analyticsData?.overview?.totalStudyTime}h</p>
            </div>
            <div className="text-3xl opacity-80">⏱️</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Completed</p>
              <p className="text-3xl font-bold">{analyticsData?.overview?.coursesCompleted}</p>
            </div>
            <div className="text-3xl opacity-80">✅</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Avg Score</p>
              <p className="text-3xl font-bold">{analyticsData?.overview?.averageScore}%</p>
            </div>
            <div className="text-3xl opacity-80">📊</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Streak</p>
              <p className="text-3xl font-bold">{analyticsData?.overview?.streakDays}</p>
            </div>
            <div className="text-3xl opacity-80">🔥</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pink-100 text-sm">Points</p>
              <p className="text-3xl font-bold">{analyticsData?.overview?.pointsEarned}</p>
            </div>
            <div className="text-3xl opacity-80">⭐</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm">Badges</p>
              <p className="text-3xl font-bold">{analyticsData?.overview?.badgesEarned}</p>
            </div>
            <div className="text-3xl opacity-80">🏆</div>
          </div>
        </div>
      </div>

      {/* Study Pattern and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Study Pattern */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Study Pattern</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analyticsData?.studyPattern?.dailyAverage}h</div>
              <div className="text-sm text-gray-600">Daily Average</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{analyticsData?.studyPattern?.bestDay}</div>
              <div className="text-sm text-gray-600">Best Day</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Weekly Goal Progress</span>
              <span className="font-medium">
                {analyticsData?.studyPattern?.weeklyData?.reduce((acc, day) => acc + day.hours, 0).toFixed(1)}h / {analyticsData?.studyPattern?.weeklyGoal}h
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ 
                  width: `${Math.min(
                    (analyticsData?.studyPattern?.weeklyData?.reduce((acc, day) => acc + day.hours, 0) / analyticsData?.studyPattern?.weeklyGoal) * 100,
                    100
                  )}%` 
                }}
              ></div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Weekly Breakdown</h4>
            <div className="grid grid-cols-7 gap-2">
              {analyticsData?.studyPattern?.weeklyData?.map((day, index) => (
                <div key={`day-${day.day}-${index}`} className="text-center">
                  <div className="text-xs text-gray-600 mb-1">{day.day}</div>
                  <div className="bg-gray-100 rounded-lg p-2">
                    <div className="text-sm font-bold text-blue-600">{day.hours}h</div>
                    <div 
                      className="bg-blue-500 rounded mt-1"
                      style={{ height: `${Math.max(day.hours * 10, 4)}px` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Trends */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Trends</h3>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{getTrendIcon(analyticsData?.performance?.improvementTrend)}</span>
              <div>
                <div className="font-medium text-gray-900">Overall Trend</div>
                <div className="text-sm text-gray-600 capitalize">{analyticsData?.performance?.improvementTrend}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">{analyticsData?.performance?.consistencyScore}%</div>
              <div className="text-sm text-gray-600">Consistency</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Quiz Scores</h4>
              <div className="flex items-end space-x-2 h-16">
                {analyticsData?.performance?.quizScores?.map((quiz, index) => (
                  <div key={`quiz-${quiz.score}-${index}`} className="flex-1 flex flex-col items-center">
                    <div
                      className="bg-blue-500 rounded-t w-full"
                      style={{ height: `${(quiz.score / 100) * 60}px` }}
                    ></div>
                    <div className="text-xs text-gray-600 mt-1">{quiz.score}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Assignment Scores</h4>
              <div className="flex items-end space-x-2 h-16">
                {analyticsData?.performance?.assignmentScores?.map((assignment, index) => (
                  <div key={`assignment-${assignment.score}-${index}`} className="flex-1 flex flex-col items-center">
                    <div
                      className="bg-orange-500 rounded-t w-full"
                      style={{ height: `${(assignment.score / 100) * 60}px` }}
                    ></div>
                    <div className="text-xs text-gray-600 mt-1">{assignment.score}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Progress */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Course Progress</h3>
        <div className="space-y-6">
          {analyticsData?.courseProgress?.map((course, index) => (
            <div key={`course-${course.course}-${index}`} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{course.course}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  course.completion === 'completed' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {course.completion}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                <div>
                  <span className="text-gray-600">Progress:</span>
                  <span className="ml-2 font-medium">{course.progress}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Time Spent:</span>
                  <span className="ml-2 font-medium">{course.timeSpent}h</span>
                </div>
                <div>
                  <span className="text-gray-600">Avg Score:</span>
                  <span className="ml-2 font-medium">{course.avgScore}%</span>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor(course.progress)}`}
                  style={{ width: `${course.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skill Development and Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skill Development */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Skill Development</h3>
          <div className="space-y-4">
            {analyticsData?.skillDevelopment?.map((skill, index) => (
              <div key={`skill-${skill.skill}-${index}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{skill.skill}</span>
                  <span className="text-sm text-gray-600">{skill.currentLevel}/10</span>
                </div>
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    {/* Start level background */}
                    <div
                      className="bg-gray-400 h-3 rounded-full absolute"
                      style={{ width: `${(skill.startLevel / 10) * 100}%` }}
                    ></div>
                    {/* Current level */}
                    <div
                      className={`h-3 rounded-full absolute ${getSkillLevelColor(skill.currentLevel)}`}
                      style={{ width: `${(skill.currentLevel / 10) * 100}%` }}
                    ></div>
                    {/* Target marker */}
                    <div
                      className="absolute top-0 w-1 h-3 bg-red-500"
                      style={{ left: `${(skill.target / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Start: {skill.startLevel}</span>
                  <span>Target: {skill.target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Learning Goals */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Learning Goals</h3>
          <div className="space-y-4">
            {analyticsData?.learningGoals?.map((goal) => (
              <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{goal.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    goal.current >= goal.target ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {goal.current >= goal.target ? 'Achieved' : 'In Progress'}
                  </span>
                </div>
                
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{goal.current}{goal.type === 'course' ? '%' : goal.type === 'time' ? 'h' : '%'} / {goal.target}{goal.type === 'course' ? '%' : goal.type === 'time' ? 'h' : '%'}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${goal.current >= goal.target ? 'bg-orange-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  Due: {goal.deadline}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Personalized Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analyticsData?.recommendations?.map((rec, index) => (
            <div key={`rec-${rec.title}-${index}`} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{rec.title}</h4>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {rec.confidence}% match
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{rec.reason}</p>
              <button className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
                {rec.type === 'course' ? 'Explore Course' : 'Learn More'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentAnalytics;
