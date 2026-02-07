import { useState, useEffect } from 'react';
import { FaQuestion, FaQuestionCircle, FaSearch, FaEye, FaDownload, FaFilter, FaBookOpen, FaGraduationCap, FaChartBar } from 'react-icons/fa';
import { questionService } from '../../../services/questionService';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import BranchLayout from '../BranchLayout';
const BranchQuestion = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Dynamic filter options
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [difficulties, setDifficulties] = useState(['Easy', 'Medium', 'Hard']);

  // Load filter options from API
  const loadFilterOptions = async () => {
    try {
      const response = await questionService.getFilterOptions();

      if (response.success && response.filters) {
        if (response.filters.subjects && Array.isArray(response.filters.subjects)) {
          setSubjects(response.filters.subjects);
        }
        if (response.filters.courses && Array.isArray(response.filters.courses)) {
          setCourses(response.filters.courses);
        }
        if (response.filters.difficulties && Array.isArray(response.filters.difficulties)) {
          setDifficulties(response.filters.difficulties);
        }
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
      // Keep default difficulties if API fails
    }
  };

  // Load questions from API
  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        subject: subjectFilter || undefined,
        course: courseFilter || undefined,
        difficulty: difficultyFilter || undefined
      };

      console.log('🔍 Loading questions with params:', params);
      const response = await questionService.getQuestions(params);

      if (response.success) {
        // Convert API response format to match the frontend format
        const questionsData = response.questions.map(q => ({
          id: q.id,
          questionText: q.question_text,
          explanation: q.explanation,
          optionA: q.option_a,
          optionB: q.option_b,
          optionC: q.option_c,
          optionD: q.option_d,
          correctAnswer: q.correct_answer,
          subject: q.subject,
          course: q.course,
          difficulty: q.difficulty,
          marks: q.marks,
          created_at: q.created_at,
          created_by: q.created_by
        }));

        setQuestions(questionsData);
        setTotalQuestions(response.total);
        setTotalPages(response.total_pages);
        console.log(`✅ Loaded ${questionsData.length} questions, page ${currentPage}/${response.total_pages}`);
      } else {
        throw new Error(response.message || 'Failed to load questions');
      }
    } catch (error) {
      console.error('❌ Error loading questions:', error);
      setError(error.message || 'Failed to load questions');
      setQuestions([]);
      setTotalQuestions(0);
      setTotalPages(1);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [currentPage, searchTerm, subjectFilter, courseFilter, difficultyFilter]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Since filtering is done on the server side, we use the questions directly
  const filteredQuestions = questions;

  // Handle preview question
  const handlePreview = (question) => {
    setSelectedQuestion(question);
    setShowPreviewModal(true);
  };

  // Handle download question
  const handleDownload = (question) => {
    const content = `
Question Bank Export:
==================

Question: ${question.questionText}

Options:
a) ${question.optionA}
b) ${question.optionB}
c) ${question.optionC}
d) ${question.optionD}

Correct Answer: ${question.correctAnswer}) ${question[`option${question.correctAnswer}`]}

Explanation: ${question.explanation || 'No explanation provided'}

Details:
--------
Subject: ${question.subject}
Course: ${question.course}
Difficulty: ${question.difficulty}
Marks: ${question.marks}
Created By: ${question.created_by}
Created On: ${new Date(question.created_at).toLocaleDateString()}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `question_${question.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-orange-100 text-orange-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get subject statistics
  const getSubjectStats = () => {
    const stats = {};
    questions.forEach(q => {
      if (stats[q.subject]) {
        stats[q.subject]++;
      } else {
        stats[q.subject] = 1;
      }
    });
    return Object.entries(stats).map(([subject, count]) => ({ subject, count }));
  };

  // Format date
  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
  };

  // Pagination - Server-side pagination, so we use questions directly
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = questions; // Server already returns paginated data

  const subjectStats = getSubjectStats();

  return (
    <BranchLayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-4 py-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-lg">
                  <FaQuestionCircle className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Available Questions</h1>
                  <p className="text-gray-600">View questions available for your branch exams</p>
                </div>
              </div>
              <div className="text-sm text-gray-500 bg-blue-50 px-4 py-2 rounded-lg self-start md:self-auto">
                <span className="font-medium">Branch Access:</span> View Only
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 check-lg:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaQuestion className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Questions</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalQuestions}</p>
                  <p className="text-xs text-blue-600">Available for exams</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaBookOpen className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Subjects</p>
                  <p className="text-2xl font-semibold text-gray-900">{subjectStats.length}</p>
                  <p className="text-xs text-orange-600">Different subjects</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaGraduationCap className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Courses</p>
                  <p className="text-2xl font-semibold text-gray-900">{new Set(questions.map(q => q.course)).size}</p>
                  <p className="text-xs text-purple-600">Different courses</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaChartBar className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg. Difficulty</p>
                  <p className="text-2xl font-semibold text-gray-900">Medium</p>
                  <p className="text-xs text-orange-600">Question level</p>
                </div>
              </div>
            </div>
          </div>


          {/* Filters */}
          <div className="bg-white shadow-sm border border-gray-200 px-4 py-4 md:px-6 rounded-lg mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>

              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Courses</option>
                {courses.map(course => (
                  <option key={course} value={course}>
                    {course.length > 25 ? course.substring(0, 25) + '...' : course}
                  </option>
                ))}
              </select>

              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Levels</option>
                {difficulties.map(difficulty => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </select>

              <div className="text-sm text-gray-600 flex items-center justify-end sm:col-span-2 lg:col-span-1">
                <FaFilter className="w-4 h-4 mr-2" />
                Total: {filteredQuestions.length} Items
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead className="bg-blue-600 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wider">
                          S.NO.
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wider">
                          Question
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wider">
                          Difficulty
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wider">
                          Marks
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentItems.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                            <FaQuestion className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                            <p className="text-lg font-medium text-gray-900 mb-2">No questions available</p>
                            <p className="text-gray-600">No questions found matching your criteria.</p>
                          </td>
                        </tr>
                      ) : (
                        currentItems.map((question, index) => (
                          <tr key={question.id} className="hover:bg-gray-50 transition-colors duration-200">
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {indexOfFirstItem + index + 1}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              <div className="max-w-md">
                                <p className="font-medium mb-1" title={question.questionText}>
                                  {question.questionText.length > 80
                                    ? question.questionText.substring(0, 80) + '...'
                                    : question.questionText
                                  }
                                </p>
                                <p className="text-xs text-gray-500">
                                  Course: {question.course.length > 30 ? question.course.substring(0, 30) + '...' : question.course}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {question.subject}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                                {question.difficulty}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900">
                              {question.marks}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handlePreview(question)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="View Details"
                                >
                                  <FaEye className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleDownload(question)}
                                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                  title="Download Question"
                                >
                                  <FaDownload className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                  {currentItems.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <FaQuestion className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">No questions available</p>
                      <p className="text-gray-600">No questions found matching your criteria.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {currentItems.map((question, index) => (
                        <div key={question.id} className="p-4 bg-white hover:bg-gray-50">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-500">#{indexOfFirstItem + index + 1}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                                  {question.difficulty}
                                </span>
                              </div>

                              <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">
                                {question.questionText}
                              </h3>

                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                  {question.subject}
                                </span>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                  {question.marks} Marks
                                </span>
                              </div>

                              <p className="text-xs text-gray-500 line-clamp-1 mb-3">
                                {question.course}
                              </p>

                              <div className="flex justify-end gap-2 border-t pt-3 border-gray-100">
                                <button
                                  onClick={() => handlePreview(question)}
                                  className="flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors"
                                >
                                  <FaEye className="w-3 h-3 mr-1" />
                                  View
                                </button>
                                <button
                                  onClick={() => handleDownload(question)}
                                  className="flex items-center text-xs font-medium text-orange-600 bg-orange-50 px-3 py-1.5 rounded hover:bg-orange-100 transition-colors"
                                >
                                  <FaDownload className="w-3 h-3 mr-1" />
                                  Download
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-4 md:px-6 bg-gray-50 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700 text-center sm:text-left">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalQuestions)} of {totalQuestions} questions
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md flex items-center">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Subject Statistics */}
          {subjectStats.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Distribution by Subject</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {subjectStats.map(({ subject, count }) => (
                  <div key={subject} className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{count}</p>
                    <p className="text-sm text-gray-600">{subject}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {showPreviewModal && selectedQuestion && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-t-xl sm:rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/20 transform transition-transform duration-300">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">Question Details</h3>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                {/* Question Overview */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-blue-600 text-white p-3 rounded-lg">
                      <FaQuestion className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(selectedQuestion.difficulty)}`}>
                          {selectedQuestion.difficulty}
                        </span>
                        <span className="text-sm text-gray-600">Marks: {selectedQuestion.marks}</span>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">{selectedQuestion.questionText}</h2>
                      <div className="text-sm text-gray-600">
                        <span className="mr-4">Subject: {selectedQuestion.subject}</span>
                        <span>Course: {selectedQuestion.course}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Answer Options */}
                <div className="space-y-3 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Answer Options:</h4>
                  {['A', 'B', 'C', 'D'].map((option) => (
                    <div
                      key={option}
                      className={`p-4 rounded-lg border-2 transition-colors ${selectedQuestion.correctAnswer === option
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-700 w-8">
                          {option.toLowerCase()})
                        </span>
                        <span className="flex-1 text-gray-800">
                          {selectedQuestion[`option${option}`]}
                        </span>
                        {selectedQuestion.correctAnswer === option && (
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                            Correct Answer
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                {selectedQuestion.explanation && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <span className="text-yellow-600 mr-2">💡</span>
                      Explanation:
                    </h4>
                    <p className="text-gray-800">{selectedQuestion.explanation}</p>
                  </div>
                )}

                {/* Administrative Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Administrative Information:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Created By:</span>
                      <span className="ml-2 text-gray-600">{selectedQuestion.created_by}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Created On:</span>
                      <span className="ml-2 text-gray-600">{formatDate(selectedQuestion.created_at)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Subject Category:</span>
                      <span className="ml-2 text-gray-600">{selectedQuestion.subject}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Question ID:</span>
                      <span className="ml-2 text-gray-600">{selectedQuestion.id}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0 z-10">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDownload(selectedQuestion)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                >
                  <FaDownload className="w-4 h-4" />
                  <span>Download Question</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Container */}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
    </BranchLayout>
  );
};

export default BranchQuestion;
