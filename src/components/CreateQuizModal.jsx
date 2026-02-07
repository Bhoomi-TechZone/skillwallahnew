import axios from 'axios';
import { useState } from 'react';

const CreateQuizModal = ({
  isOpen,
  onClose,
  courses,
  onQuizCreated,
  onRefreshCourses
}) => {
  const [formData, setFormData] = useState({
    title: '',
    course_id: '',
    quiz_type: 'mcq',
    duration_minutes: '',
    max_attempts: '',
    description: '',
    quiz_guidelines: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (error) {
      setError('');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      course_id: '',
      quiz_type: 'mcq',
      duration_minutes: '',
      max_attempts: '',
      description: '',
      quiz_guidelines: ''
    });
    setError('');
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validation
    if (!formData.title.trim()) {
      setError('Quiz title is required');
      setIsLoading(false);
      return;
    }

    if (!formData.course_id) {
      setError('Please select a course');
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in again');
        setIsLoading(false);
        return;
      }

      const payload = {
        course_id: formData.course_id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        quiz_guidelines: formData.quiz_guidelines.trim(),
        quiz_type: formData.quiz_type,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        max_attempts: formData.max_attempts ? parseInt(formData.max_attempts) : null
      };

      console.log('🔄 Creating quiz with payload:', payload);

      const response = await axios.post('http://localhost:4000/quizzes/', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Quiz creation response:', response.data);

      if (response.status === 200 || response.status === 201) {
        // Call the callback to refresh data and show success
        onQuizCreated('Quiz created successfully!');
        handleClose();
      }
    } catch (error) {
      console.error('❌ Error creating quiz:', error);

      if (error.response) {
        setError(`Failed to create quiz: ${error.response.data?.detail || error.response.statusText}`);
      } else if (error.request) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to create quiz. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create New Quiz</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quiz Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter quiz title..."
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.course_id}
              onChange={(e) => handleInputChange('course_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Course</option>
              {Array.isArray(courses) && courses.length > 0 ? (
                courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title || 'Untitled Course'}
                  </option>
                ))
              ) : (
                <option disabled>Loading courses...</option>
              )}
            </select>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {Array.isArray(courses) ? `${courses.length} courses available` : 'Loading courses...'}
              </p>
              <button
                type="button"
                onClick={onRefreshCourses}
                className="text-sm text-blue-500 hover:text-blue-700 underline"
              >
                Refresh Courses
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Type</label>
            <select
              value={formData.quiz_type}
              onChange={(e) => handleInputChange('quiz_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="mcq">Multiple Choice Questions</option>
              <option value="true_false">True/False</option>
              <option value="fill_blanks">Fill in the Blanks</option>
              <option value="subjective">Subjective</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="480"
                value={formData.duration_minutes}
                onChange={(e) => handleInputChange('duration_minutes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 30"
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited time</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Attempts</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.max_attempts}
                onChange={(e) => handleInputChange('max_attempts', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 3"
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited attempts</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Brief description of the quiz (optional)..."
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Guidelines</label>
            <textarea
              value={formData.quiz_guidelines}
              onChange={(e) => handleInputChange('quiz_guidelines', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Instructions or guidelines for quiz takers (optional)..."
              autoComplete="off"
            />
          </div>

          <div className="flex space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-[#988913] to-[#7d7310] hover:from-[#7d7310] hover:to-[#988913] text-white py-3 px-4 rounded-lg shadow hover:shadow-lg hover:shadow-[#988913]/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : 'Create Quiz'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateQuizModal;
