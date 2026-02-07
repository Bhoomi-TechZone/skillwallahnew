import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// Question Component for dynamic question creation
const QuestionForm = ({ question, index, onUpdate, onRemove, quizType }) => {
  // Add debugging to see when component re-renders
  useEffect(() => {
    console.log(`🔄 QuestionForm ${index + 1} re-rendered with:`, question);
    console.log(`🔍 QuestionForm ${index + 1} options:`, question.options);
  }, [question, index]);

  // Also track when options change specifically
  useEffect(() => {
    console.log(`🎯 QuestionForm ${index + 1} options changed to:`, question.options);
  }, [question.options, index]);

  const handleQuestionChange = (field, value) => {
    console.log(`📝 Question ${index + 1} field '${field}' changing to:`, value);
    onUpdate(index, { ...question, [field]: value });
  };

  const handleOptionChange = (optionIndex, value) => {
    console.log(`📝 Option ${optionIndex + 1} in Question ${index + 1} changing from "${question.options[optionIndex]}" to "${value}"`);
    const newOptions = [...question.options];
    newOptions[optionIndex] = value;
    console.log('📋 New options array:', newOptions);
    handleQuestionChange('options', newOptions);
  };

  const addOption = () => {
    console.log(`➕ Adding new option to Question ${index + 1}, current options:`, question.options);
    const newOptions = [...question.options, ''];
    console.log('📋 New options after adding:', newOptions);
    handleQuestionChange('options', newOptions);
  };

  const removeOption = (optionIndex) => {
    if (question.options.length > 2) {
      console.log(`➖ Removing option ${optionIndex + 1} from Question ${index + 1}, current options:`, question.options);
      const newOptions = question.options.filter((_, i) => i !== optionIndex);
      console.log('📋 Options after removal:', newOptions);

      // Reset correct answer if it was pointing to removed option
      let newCorrectAnswer = question.correct_answer;
      if (question.correct_answer === optionIndex.toString()) {
        newCorrectAnswer = '0';
        console.log(`🔄 Resetting correct answer from ${optionIndex} to 0`);
      } else if (parseInt(question.correct_answer) > optionIndex) {
        // Adjust correct answer index if it's after the removed option
        newCorrectAnswer = (parseInt(question.correct_answer) - 1).toString();
        console.log(`🔄 Adjusting correct answer from ${question.correct_answer} to ${newCorrectAnswer}`);
      }

      // Update both options and correct_answer
      const updatedQuestion = {
        ...question,
        options: newOptions,
        correct_answer: newCorrectAnswer
      };

      console.log('✅ Updated question after option removal:', updatedQuestion);
      onUpdate(index, updatedQuestion);
    }
  };

  const renderQuestionFields = () => {
    switch (quizType) {
      case 'mcq':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text <span className="text-red-500">*</span>
              </label>
              <textarea
                value={question.question || ''}
                onChange={(e) => {
                  console.log(`📝 Question ${index + 1} text changing from "${question.question}" to "${e.target.value}"`);
                  handleQuestionChange('question', e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Enter your question..."
                rows={2}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options <span className="text-red-500">*</span>
              </label>
              {question.options?.map((option, optionIndex) => (
                <div key={`option-${index}-${optionIndex}-${question.id || 'new'}`} className="flex items-center space-x-2 mb-2">
                  <input
                    type="radio"
                    name={`correct-${index}`}
                    checked={question.correct_answer === optionIndex.toString()}
                    onChange={() => handleQuestionChange('correct_answer', optionIndex.toString())}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={option || ''}
                    onChange={(e) => {
                      console.log(`📝 MCQ Option ${optionIndex + 1} in Question ${index + 1} changing from "${option}" to "${e.target.value}"`);
                      handleOptionChange(optionIndex, e.target.value);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Option ${optionIndex + 1}`}
                    required
                  />
                  {question.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(optionIndex)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addOption}
                className="mt-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              >
                + Add Option
              </button>
            </div>
          </div>
        );

      case 'true_false':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text <span className="text-red-500">*</span>
              </label>
              <textarea
                value={question.question || ''}
                onChange={(e) => {
                  console.log(`📝 True/False Question ${index + 1} text changing from "${question.question}" to "${e.target.value}"`);
                  handleQuestionChange('question', e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Enter your true/false question..."
                rows={2}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correct Answer <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={`tf-answer-${index}`}
                    value="true"
                    checked={question.correct_answer === 'true'}
                    onChange={(e) => handleQuestionChange('correct_answer', e.target.value)}
                    className="text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  True
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={`tf-answer-${index}`}
                    value="false"
                    checked={question.correct_answer === 'false'}
                    onChange={(e) => handleQuestionChange('correct_answer', e.target.value)}
                    className="text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  False
                </label>
              </div>
            </div>
          </div>
        );

      case 'fill_blanks':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text <span className="text-red-500">*</span>
                <span className="text-sm text-gray-500 ml-2">(Use ___ to mark blanks)</span>
              </label>
              <textarea
                value={question.question || ''}
                onChange={(e) => {
                  console.log(`📝 Fill Blanks Question ${index + 1} text changing from "${question.question}" to "${e.target.value}"`);
                  handleQuestionChange('question', e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="e.g., The capital of France is ___"
                rows={2}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correct Answer <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={question.correct_answer || ''}
                onChange={(e) => handleQuestionChange('correct_answer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter the correct answer for the blank"
                required
              />
            </div>
          </div>
        );

      case 'subjective':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text <span className="text-red-500">*</span>
              </label>
              <textarea
                value={question.question || ''}
                onChange={(e) => {
                  console.log(`📝 Subjective Question ${index + 1} text changing from "${question.question}" to "${e.target.value}"`);
                  handleQuestionChange('question', e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Enter your subjective question..."
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Answer/Keywords
                <span className="text-sm text-gray-500 ml-2">(Optional - for grading reference)</span>
              </label>
              <textarea
                value={question.expected_answer || ''}
                onChange={(e) => handleQuestionChange('expected_answer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Enter expected answer or key points..."
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-medium text-gray-900">Question {index + 1}</h4>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
          title="Remove question"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      {renderQuestionFields()}
    </div>
  );
};

// Separate CreateQuizModal component to prevent re-render issues
const CreateQuizModal = ({
  isOpen,
  onClose,
  courses,
  coursesLoading = false,
  coursesError = '',
  onRefreshCourses,
  onQuizCreated,
  editQuiz = null // Add editQuiz prop for editing mode
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
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const lastEditQuizId = useRef(null); // Track the last quiz ID to prevent unnecessary refetches

  // Function to fetch quiz data for editing
  const fetchQuizForEdit = async (quizId) => {
    try {
      setIsLoading(true);
      setError(''); // Clear any previous errors

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      console.log(`🔄 Fetching quiz data for editing: ${quizId}`);

      const response = await axios.get(`http://localhost:4000/quizzes/${quizId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Quiz data fetched successfully:', response.data);

      const quizData = response.data;

      if (!quizData) {
        throw new Error('No quiz data received from server');
      }

      // Populate form with existing data
      const newFormData = {
        title: quizData.title || '',
        course_id: quizData.course_id || '',
        quiz_type: quizData.quiz_type || 'mcq',
        duration_minutes: quizData.duration_minutes ? quizData.duration_minutes.toString() : '',
        max_attempts: quizData.max_attempts ? quizData.max_attempts.toString() : '',
        description: quizData.description || '',
        quiz_guidelines: quizData.quiz_guidelines || ''
      };

      console.log('🎯 Setting form data:', newFormData);
      setFormData(newFormData);

      // Populate questions
      if (quizData.questions && Array.isArray(quizData.questions)) {
        console.log(`🔍 Raw questions received from API for quiz ${quizId}:`, quizData.questions.length, 'questions');

        // Debug each question's structure, especially MCQ options
        quizData.questions.forEach((q, index) => {
          if (q.type === 'mcq') {
            console.log(`🔍 API Question ${index + 1} (MCQ):`, {
              question: q.question?.substring(0, 50) + '...',
              options: q.options,
              optionsCount: q.options?.length || 0,
              correct_answer: q.correct_answer
            });
          }
        });

        const formattedQuestions = quizData.questions.map((question, index) => {
          console.log(`🔍 Processing question ${index + 1} for editing:`, question);

          let formattedQuestion;
          switch (question.type) {
            case 'mcq':
              // Find the correct answer index from the correct_answer value
              const correctAnswerIndex = question.options && Array.isArray(question.options) ?
                question.options.findIndex(opt => opt === question.correct_answer) : 0;

              console.log(`🔍 MCQ Question ${index + 1} - Original options:`, question.options);
              console.log(`🔍 MCQ Question ${index + 1} - Correct answer: "${question.correct_answer}", Index: ${correctAnswerIndex}`);

              formattedQuestion = {
                id: `edit-${Date.now()}-${index}`, // Unique ID for React key
                type: 'mcq',
                question: question.question || '',
                options: Array.isArray(question.options) && question.options.length > 0
                  ? [...question.options] // Use actual options from API
                  : ['', '', '', ''], // Fallback only if no options exist
                correct_answer: correctAnswerIndex >= 0 ? correctAnswerIndex.toString() : '0'
              };

              console.log(`✅ MCQ Question ${index + 1} - Formatted options:`, formattedQuestion.options);
              break;
            case 'true_false':
              formattedQuestion = {
                id: `edit-${Date.now()}-${index}`, // Unique ID for React key
                type: 'true_false',
                question: question.question || '',
                correct_answer: question.correct_answer === true || question.correct_answer === 'true' ? 'true' : 'false'
              };
              break;
            case 'fill_blanks':
              formattedQuestion = {
                id: `edit-${Date.now()}-${index}`, // Unique ID for React key
                type: 'fill_blanks',
                question: question.question || '',
                correct_answer: question.correct_answer || ''
              };
              break;
            case 'subjective':
              formattedQuestion = {
                id: `edit-${Date.now()}-${index}`, // Unique ID for React key
                type: 'subjective',
                question: question.question || '',
                expected_answer: question.expected_answer || ''
              };
              break;
            default:
              formattedQuestion = {
                id: `edit-${Date.now()}-${index}`, // Unique ID for React key
                ...question
              };
          }

          console.log(`✅ Formatted question ${index + 1} for editing:`, formattedQuestion);
          return formattedQuestion;
        });

        console.log('🎯 Setting formatted questions for editing:', formattedQuestions.length, 'questions');

        // Debug the final formatted questions, especially MCQ options
        formattedQuestions.forEach((q, index) => {
          if (q.type === 'mcq') {
            console.log(`🎯 Final Question ${index + 1} (MCQ):`, {
              question: q.question?.substring(0, 50) + '...',
              options: q.options,
              optionsCount: q.options?.length || 0,
              correct_answer: q.correct_answer
            });
          }
        });

        setQuestions(formattedQuestions);

        // Force a small delay to ensure React processes the state update
        setTimeout(() => {
          console.log('🔍 Questions state after timeout:', formattedQuestions);
        }, 100);
      } else {
        console.log('⚠️ No questions found in quiz data');
        setQuestions([]);
      }

      setError('');
    } catch (error) {
      console.error('❌ Error fetching quiz for edit:', error);
      setError('Failed to load quiz data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form when modal opens or edit quiz changes
  useEffect(() => {
    if (isOpen) {
      const currentQuizId = editQuiz ? (editQuiz._id || editQuiz.id) : null;
      console.log('🔄 Modal opened, editQuiz:', editQuiz, 'currentQuizId:', currentQuizId, 'lastQuizId:', lastEditQuizId.current);

      if (editQuiz && currentQuizId) {
        // Only fetch if it's a different quiz or first time opening
        if (lastEditQuizId.current !== currentQuizId) {
          console.log('✅ Edit mode detected, fetching quiz data...');
          setIsEditMode(true);
          lastEditQuizId.current = currentQuizId;
          fetchQuizForEdit(currentQuizId);
        }
      } else if (!editQuiz) {
        console.log('✅ Create mode detected, resetting form...');
        setIsEditMode(false);
        lastEditQuizId.current = null;
        setFormData({
          title: '',
          course_id: '',
          quiz_type: 'mcq',
          duration_minutes: '',
          max_attempts: '',
          description: '',
          quiz_guidelines: ''
        });
        setQuestions([]);
        setError('');
      }
    }
  }, [isOpen, editQuiz]);

  // Clean up when modal closes
  useEffect(() => {
    if (!isOpen) {
      lastEditQuizId.current = null;
    }
  }, [isOpen]);

  // Initialize questions when quiz type changes (only if not in edit mode or questions array is empty)
  useEffect(() => {
    if (formData.quiz_type && questions.length === 0 && !isEditMode) {
      addQuestion();
    }
  }, [formData.quiz_type, isEditMode]);

  const createDefaultQuestion = (type) => {
    const baseId = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    switch (type) {
      case 'mcq':
        return {
          id: baseId,
          type: 'mcq',
          question: '',
          options: ['', '', '', ''],
          correct_answer: '0'
        };
      case 'true_false':
        return {
          id: baseId,
          type: 'true_false',
          question: '',
          correct_answer: 'true'
        };
      case 'fill_blanks':
        return {
          id: baseId,
          type: 'fill_blanks',
          question: '',
          correct_answer: ''
        };
      case 'subjective':
        return {
          id: baseId,
          type: 'subjective',
          question: '',
          expected_answer: ''
        };
      default:
        return null;
    }
  };

  const addQuestion = () => {
    const newQuestion = createDefaultQuestion(formData.quiz_type);
    if (newQuestion) {
      setQuestions(prev => [...prev, newQuestion]);
    }
  };

  const updateQuestion = (index, updatedQuestion) => {
    console.log(`🔄 Updating question ${index}:`, updatedQuestion);
    setQuestions(prev => {
      const newQuestions = prev.map((q, i) => {
        if (i === index) {
          // Force a complete new object to ensure React detects the change
          const newQuestion = {
            ...q,
            ...updatedQuestion,
            // Add a timestamp to force re-render if needed
            _lastUpdated: Date.now()
          };
          console.log(`📝 Question ${index} updated from:`, q);
          console.log(`📝 Question ${index} updated to:`, newQuestion);
          return newQuestion;
        }
        return q;
      });
      console.log('📝 All questions after update:', newQuestions);
      return newQuestions;
    });
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Reset questions when quiz type changes
    if (field === 'quiz_type' && !isEditMode) {
      setQuestions([]);
    }

    if (error) {
      setError('');
    }
  };

  // Test function to validate API connection and token
  const testApiConnection = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Testing API connection...');

      // Test basic connection
      const testResponse = await axios.get('http://localhost:4000/quizzes/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ API connection test successful:', testResponse.status);
      return true;
    } catch (error) {
      console.error('❌ API connection test failed:', error);
      return false;
    }
  };

  // Validation function to clean payload
  const validateAndCleanPayload = (payload) => {
    // Create a clean copy
    const cleanPayload = JSON.parse(JSON.stringify(payload));

    // Ensure required fields are present and valid
    if (!cleanPayload.course_id ||
      (typeof cleanPayload.course_id === 'string' && cleanPayload.course_id.trim() === '') ||
      (typeof cleanPayload.course_id === 'number' && isNaN(cleanPayload.course_id))) {
      throw new Error('Valid course selection is required');
    }

    if (!cleanPayload.title || cleanPayload.title.trim() === '') {
      throw new Error('Quiz title is required');
    }

    if (!cleanPayload.quiz_type) {
      throw new Error('Quiz type is required');
    }

    if (!cleanPayload.questions || cleanPayload.questions.length === 0) {
      throw new Error('At least one question is required');
    }

    // Clean up string fields - ensure they are never null/undefined
    cleanPayload.title = cleanPayload.title.trim();
    cleanPayload.description = cleanPayload.description?.trim() || '';
    cleanPayload.quiz_guidelines = cleanPayload.quiz_guidelines?.trim() || '';

    // Ensure numeric fields are proper numbers or null (not undefined)
    cleanPayload.duration_minutes = cleanPayload.duration_minutes ? parseInt(cleanPayload.duration_minutes) : null;
    cleanPayload.max_attempts = cleanPayload.max_attempts ? parseInt(cleanPayload.max_attempts) : null;

    // Handle course_id format - accept both string and number formats
    console.log('🔍 Original course_id:', cleanPayload.course_id, 'Type:', typeof cleanPayload.course_id);

    if (typeof cleanPayload.course_id === 'string') {
      // If it's a string, check if it's a valid ID (not empty, could be numeric or alphanumeric)
      const trimmedId = cleanPayload.course_id.trim();
      if (trimmedId === '' || trimmedId === 'undefined' || trimmedId === 'null') {
        throw new Error('Valid course selection is required');
      }

      // Try to convert to number if it's purely numeric
      if (/^\d+$/.test(trimmedId)) {
        cleanPayload.course_id = parseInt(trimmedId);
        console.log('🔄 Converted string course_id to number:', cleanPayload.course_id);
      } else {
        // Keep as string for alphanumeric IDs
        cleanPayload.course_id = trimmedId;
        console.log('🔄 Kept course_id as string:', cleanPayload.course_id);
      }
    } else if (typeof cleanPayload.course_id === 'number') {
      // If it's already a number, ensure it's valid
      if (isNaN(cleanPayload.course_id) || cleanPayload.course_id <= 0) {
        throw new Error('Valid course selection is required');
      }
      console.log('✅ Course_id is valid number:', cleanPayload.course_id);
    } else {
      // If it's neither string nor number, it's invalid
      console.error('❌ Invalid course_id type:', typeof cleanPayload.course_id, cleanPayload.course_id);
      throw new Error('Valid course selection is required');
    }

    // Add status field if missing (backend might require this)
    if (!cleanPayload.hasOwnProperty('is_active')) {
      cleanPayload.is_active = true;
    }

    // Validate questions structure
    cleanPayload.questions.forEach((question, index) => {
      if (!question.question || question.question.trim() === '') {
        throw new Error(`Question ${index + 1}: Question text is required`);
      }

      // Ensure question has proper type
      if (!question.type) {
        throw new Error(`Question ${index + 1}: Question type is required`);
      }

      // Type-specific validation and cleaning
      switch (question.type) {
        case 'mcq':
          if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
            throw new Error(`Question ${index + 1}: At least 2 options are required for MCQ`);
          }
          if (!question.correct_answer || question.correct_answer.trim() === '') {
            throw new Error(`Question ${index + 1}: Correct answer is required for MCQ`);
          }
          break;

        case 'true_false':
          // Ensure correct_answer is a string 'true' or 'false'
          if (typeof question.correct_answer === 'boolean') {
            question.correct_answer = question.correct_answer ? 'true' : 'false';
          } else if (typeof question.correct_answer === 'string') {
            const normalizedAnswer = question.correct_answer.toLowerCase().trim();
            if (normalizedAnswer === 'true' || normalizedAnswer === '1' || normalizedAnswer === 'yes') {
              question.correct_answer = 'true';
            } else if (normalizedAnswer === 'false' || normalizedAnswer === '0' || normalizedAnswer === 'no') {
              question.correct_answer = 'false';
            } else {
              throw new Error(`Question ${index + 1}: True/False answer must be 'true' or 'false'`);
            }
          } else {
            throw new Error(`Question ${index + 1}: True/False answer must be 'true' or 'false'`);
          }
          break;

        case 'fill_blanks':
          if (!question.correct_answer || question.correct_answer.trim() === '') {
            throw new Error(`Question ${index + 1}: Correct answer is required for fill in the blanks`);
          }
          if (!question.question.includes('___')) {
            throw new Error(`Question ${index + 1}: Fill in the blanks must contain ___`);
          }
          break;

        case 'subjective':
          // Expected answer is optional for subjective questions
          question.expected_answer = question.expected_answer?.trim() || '';
          break;

        default:
          throw new Error(`Question ${index + 1}: Invalid question type '${question.type}'`);
      }

      // Ensure question text is trimmed
      question.question = question.question.trim();
    });

    // Remove any undefined values (but keep null values for optional fields)
    Object.keys(cleanPayload).forEach(key => {
      if (cleanPayload[key] === undefined) {
        delete cleanPayload[key];
      }
    });

    // Log final payload structure for debugging
    console.log('🧹 Cleaned payload structure:', {
      course_id: typeof cleanPayload.course_id,
      title: typeof cleanPayload.title,
      description: typeof cleanPayload.description,
      quiz_guidelines: typeof cleanPayload.quiz_guidelines,
      quiz_type: typeof cleanPayload.quiz_type,
      duration_minutes: typeof cleanPayload.duration_minutes,
      max_attempts: typeof cleanPayload.max_attempts,
      is_active: typeof cleanPayload.is_active,
      questions: cleanPayload.questions.length + ' questions',
      questionTypes: cleanPayload.questions.map(q => q.type)
    });

    return cleanPayload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

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

    if (questions.length === 0) {
      setError('Please add at least one question');
      setIsLoading(false);
      return;
    }

    // Validate questions based on type
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      if (!question.question?.trim()) {
        setError(`Question ${i + 1}: Question text is required`);
        setIsLoading(false);
        return;
      }

      if (question.type === 'mcq') {
        if (!question.options || question.options.length < 2) {
          setError(`Question ${i + 1}: At least 2 options are required`);
          setIsLoading(false);
          return;
        }

        const filledOptions = question.options.filter(opt => opt.trim());
        if (filledOptions.length < 2) {
          setError(`Question ${i + 1}: At least 2 options must be filled`);
          setIsLoading(false);
          return;
        }

        if (!question.correct_answer && question.correct_answer !== '0') {
          setError(`Question ${i + 1}: Please select a correct answer`);
          setIsLoading(false);
          return;
        }
      }

      if (question.type === 'true_false') {
        if (!question.correct_answer) {
          setError(`Question ${i + 1}: Please select true or false`);
          setIsLoading(false);
          return;
        }
      }

      if (question.type === 'fill_blanks') {
        if (!question.correct_answer?.trim()) {
          setError(`Question ${i + 1}: Correct answer is required`);
          setIsLoading(false);
          return;
        }

        if (!question.question.includes('___')) {
          setError(`Question ${i + 1}: Use ___ to mark the blank in your question`);
          setIsLoading(false);
          return;
        }
      }
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in again');
        setIsLoading(false);
        return;
      }

      console.log(`🔄 Starting quiz ${isEditMode ? 'update' : 'creation'} process...`);

      // Test API connection first
      const connectionOk = await testApiConnection();
      if (!connectionOk) {
        setError('Unable to connect to server. Please check your internet connection and try again.');
        setIsLoading(false);
        return;
      }

      // Additional validation for course_id
      if (!formData.course_id || formData.course_id === '') {
        setError('Please select a valid course');
        setIsLoading(false);
        return;
      }

      // Validate that course_id exists in the courses list
      const selectedCourse = courses.find(course => {
        const courseId = course.id;
        return courseId?.toString() === formData.course_id?.toString();
      });

      if (!selectedCourse) {
        console.error('❌ Course validation failed:', {
          selectedId: formData.course_id,
          selectedIdType: typeof formData.course_id,
          availableCourses: courses.map(c => ({
            id: c.id,
            type: typeof c.id,
            title: c.title
          }))
        });
        setError('Selected course is not valid. Please refresh courses and select again.');
        setIsLoading(false);
        return;
      }

      console.log('✅ Selected course found:', selectedCourse);

      // Format questions for API
      const formattedQuestions = questions.map((question, index) => {
        console.log(`🔍 Processing question ${index + 1}:`, question);

        const baseQuestion = {
          type: question.type,
          question: question.question.trim()
        };

        let formattedQuestion;
        switch (question.type) {
          case 'mcq':
            const filteredOptions = question.options.filter(opt => opt && opt.trim());
            const correctAnswerIndex = parseInt(question.correct_answer);
            const correctAnswerText = question.options && question.options[correctAnswerIndex] ?
              question.options[correctAnswerIndex] :
              (filteredOptions.length > 0 ? filteredOptions[0] : '');

            console.log(`🎯 MCQ Question ${index + 1}:`, {
              originalOptions: question.options,
              filteredOptions: filteredOptions,
              correctAnswerIndex: correctAnswerIndex,
              correctAnswerText: correctAnswerText
            });

            formattedQuestion = {
              ...baseQuestion,
              options: filteredOptions,
              correct_answer: correctAnswerText
            };
            break;
          case 'true_false':
            formattedQuestion = {
              ...baseQuestion,
              correct_answer: question.correct_answer // Already validated as string in validateAndCleanPayload
            };
            break;
          case 'fill_blanks':
            formattedQuestion = {
              ...baseQuestion,
              correct_answer: question.correct_answer.trim()
            };
            break;
          case 'subjective':
            formattedQuestion = {
              ...baseQuestion,
              expected_answer: question.expected_answer?.trim() || ''
            };
            break;
          default:
            formattedQuestion = baseQuestion;
        }

        console.log(`✅ Formatted question ${index + 1}:`, formattedQuestion);
        return formattedQuestion;
      });

      // Clean payload - ensure all required fields are properly formatted
      console.log('🔍 Form data course_id:', formData.course_id, 'Type:', typeof formData.course_id);
      console.log('🔍 Selected course details:', selectedCourse);

      // Use the course ID from the selected course object to ensure consistency
      const courseId = selectedCourse.id; // Use id field consistently
      console.log('🎯 Using course ID from selected course:', courseId, 'Type:', typeof courseId);

      const rawPayload = {
        course_id: courseId, // Use the ID directly from the course object
        title: formData.title.trim(),
        description: formData.description?.trim() || '', // Empty string, not null
        quiz_guidelines: formData.quiz_guidelines?.trim() || '', // Empty string, not null
        quiz_type: formData.quiz_type, // Must be one of: mcq, true_false, fill_blanks, subjective
        duration_minutes: formData.duration_minutes && formData.duration_minutes.trim() !== ''
          ? parseInt(formData.duration_minutes)
          : null,
        max_attempts: formData.max_attempts && formData.max_attempts.trim() !== ''
          ? parseInt(formData.max_attempts)
          : null,
        questions: formattedQuestions,
        is_active: true // Explicitly set status
      };

      console.log('🔍 Raw payload before validation:', rawPayload);
      console.log('🔍 Course ID type and value:', typeof rawPayload.course_id, rawPayload.course_id);

      // Validate and clean the payload
      let payload;
      try {
        payload = validateAndCleanPayload(rawPayload);
      } catch (validationError) {
        console.error('❌ Validation error:', validationError.message);
        setError(`Validation error: ${validationError.message}`);
        setIsLoading(false);
        return;
      }

      console.log(`📤 Sending cleaned quiz payload for ${isEditMode ? 'update' : 'creation'}:`, payload);
      console.log('🔑 Using token:', token.substring(0, 20) + '...');

      const quizId = editQuiz?._id || editQuiz?.id;
      const url = isEditMode ?
        `http://localhost:4000/quizzes/${quizId}` :
        'http://localhost:4000/quizzes/';
      const method = isEditMode ? 'PUT' : 'POST';

      console.log(`🎯 Target URL: ${url} (${method})`);
      console.log('📋 Payload size:', JSON.stringify(payload).length, 'characters');

      // Debug: Log each question's structure
      payload.questions.forEach((q, index) => {
        console.log(`🔍 Question ${index + 1}:`, {
          type: q.type,
          question: q.question?.substring(0, 50) + '...',
          correct_answer: q.correct_answer,
          correct_answer_type: typeof q.correct_answer,
          options: q.options || 'N/A'
        });
      });

      const response = await axios({
        method: method,
        url: url,
        data: payload,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000, // 30 second timeout
        validateStatus: function (status) {
          // Accept any status code for debugging
          return status < 600;
        }
      });

      console.log('✅ Raw response:', response);
      console.log('✅ Response status:', response.status);
      console.log('✅ Response data:', response.data);

      if (response.status === 200 || response.status === 201) {
        const quizData = response.data;
        console.log(`✅ Quiz ${isEditMode ? 'updated' : 'created'} successfully:`, quizData);

        // In edit mode, log the questions to verify they were saved correctly
        if (isEditMode && payload.questions) {
          console.log('📝 Questions sent in update payload:');
          payload.questions.forEach((q, index) => {
            if (q.type === 'mcq') {
              console.log(`  Question ${index + 1} (MCQ): ${q.options?.length || 0} options:`, q.options);
            }
          });
        }

        // Pass the quiz data including course_id to the parent component
        onQuizCreated({
          ...quizData,
          course_id: formData.course_id,
          title: formData.title
        });
        onClose();
      }
    } catch (error) {
      console.error('❌ Error creating quiz:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });

      let errorMessage = 'Failed to create quiz. Please try again.';

      if (error.response) {
        // Server responded with error status
        console.error('📝 Full response object:', error.response);

        const status = error.response.status;
        const responseData = error.response.data;

        switch (status) {
          case 400:
            errorMessage = 'Invalid data provided. Please check your input and try again.';
            break;
          case 401:
            errorMessage = 'Authentication failed. Please log in again.';
            localStorage.removeItem('token'); // Clear invalid token
            break;
          case 403:
            errorMessage = 'Permission denied. You may not have access to create quizzes.';
            break;
          case 422:
            // Enhanced 422 error handling with specific field validation
            console.error('🔍 422 Validation Error Details:');
            console.error('Sent payload:', JSON.stringify(payload, null, 2));
            console.error('Response data:', responseData);

            errorMessage = 'Validation error: ';

            // Try to extract specific validation errors
            let validationDetails = [];
            if (responseData) {
              if (responseData.detail && Array.isArray(responseData.detail)) {
                // FastAPI validation error format
                validationDetails = responseData.detail.map(err => {
                  const field = err.loc ? err.loc.join('.') : 'unknown';
                  const message = err.msg || 'validation error';
                  const input = err.input !== undefined ? ` (received: ${JSON.stringify(err.input)})` : '';
                  return `${field}: ${message}${input}`;
                });
                errorMessage += validationDetails.join(', ');
              } else if (responseData.errors) {
                // Generic errors object
                if (typeof responseData.errors === 'object') {
                  validationDetails = Object.entries(responseData.errors).map(([field, msgs]) =>
                    `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`
                  );
                  errorMessage += validationDetails.join(', ');
                }
              } else if (responseData.message) {
                errorMessage += responseData.message;
              } else if (typeof responseData === 'string') {
                errorMessage += responseData;
              } else {
                errorMessage += 'Invalid data format. Please check your input.';
              }
            } else {
              errorMessage += 'Invalid data format. Please check your input.';
            }

            // Add helpful hints for common validation issues
            if (payload.questions && payload.questions.length > 0) {
              const questionTypes = payload.questions.map(q => q.type);
              console.error('🔍 Question types in payload:', questionTypes);

              payload.questions.forEach((q, index) => {
                console.error(`Question ${index + 1}:`, {
                  type: q.type,
                  hasQuestion: !!q.question,
                  questionLength: q.question?.length,
                  correctAnswer: q.correct_answer,
                  correctAnswerType: typeof q.correct_answer,
                  hasOptions: !!q.options,
                  optionsCount: q.options?.length
                });
              });
            }

            break;
          case 500:
            errorMessage = 'Server error occurred. This might be due to database issues or server configuration.';
            // Log the specific 500 error details
            console.error('🔥 Server 500 Error Details:');
            console.error('Response Data:', responseData);
            console.error('Response Headers:', error.response.headers);
            break;
          case 502:
            errorMessage = 'Bad gateway. The server is temporarily unavailable.';
            break;
          case 503:
            errorMessage = 'Service unavailable. Please try again later.';
            break;
          default:
            errorMessage = `Server error (${status}). Please try again later.`;
        }

        // Try to extract more specific error message from response
        if (responseData) {
          let detailMessage = '';

          if (typeof responseData === 'string') {
            detailMessage = responseData;
          } else if (responseData.detail) {
            detailMessage = responseData.detail;
          } else if (responseData.message) {
            detailMessage = responseData.message;
          } else if (responseData.error) {
            detailMessage = responseData.error;
          } else if (responseData.errors && Array.isArray(responseData.errors)) {
            detailMessage = responseData.errors.join(', ');
          }

          if (detailMessage) {
            errorMessage += ` Details: ${detailMessage}`;
          }
        }
      } else if (error.request) {
        // Network error
        console.error('🌐 Network error details:', error.request);
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.code === 'ECONNABORTED') {
        // Timeout error
        errorMessage = 'Request timeout. The server is taking too long to respond. Please try again.';
      } else {
        // Other error
        console.error('⚡ Other error:', error.message);
        errorMessage = `Error: ${error.message}`;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white bg-opacity-20 flex items-start justify-center z-50 p-4 pt-8">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl mt-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Quiz' : 'Create New Quiz'}
          </h2>
          <button
            onClick={onClose}
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

        {/* Loading state when fetching quiz data for editing */}
        {isEditMode && isLoading && !error && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div>
                <p className="text-blue-800 font-medium">Loading quiz data...</p>
                <p className="text-blue-600 text-sm">Please wait while we fetch the quiz details for editing.</p>
              </div>
            </div>
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
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2">(Only courses you created)</span>
            </label>
            <select
              value={formData.course_id}
              onChange={(e) => {
                console.log('🎯 Course selected:', e.target.value, 'Type:', typeof e.target.value);
                handleInputChange('course_id', e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
              disabled={coursesLoading}
            >
              <option value="">
                {coursesLoading ? 'Loading your courses...' : 'Select Course'}
              </option>
              {coursesLoading ? (
                <option disabled>Please wait...</option>
              ) : coursesError ? (
                <option disabled>Error loading courses</option>
              ) : Array.isArray(courses) && courses.length > 0 ? (
                courses.map(course => {
                  const courseId = course.id; // Use the id field consistently
                  console.log('📚 Course option:', courseId, typeof courseId, course.title);
                  return (
                    <option key={courseId} value={courseId}>
                      {course.title || 'Untitled Course'}
                    </option>
                  );
                })
              ) : (
                <option disabled>You haven't created any courses yet</option>
              )}
            </select>

            {/* Course Status Information */}
            <div className="mt-2 space-y-2">
              {coursesLoading ? (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Loading your courses...</span>
                </div>
              ) : coursesError ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">Failed to load courses</p>
                      <p className="text-xs text-red-600 mt-1">{coursesError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onRefreshCourses}
                    className="mt-2 w-full px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : Array.isArray(courses) && courses.length === 0 ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-800">No courses found</p>
                      <p className="text-xs text-yellow-600 mt-1">
                        You need to create a course first before you can add quizzes to it.
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex space-x-2">
                    <button
                      type="button"
                      onClick={onRefreshCourses}
                      className="flex-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 text-sm rounded hover:bg-yellow-200 transition-colors"
                    >
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // You could add navigation to course creation here
                        alert('Please go to Course Management to create a new course first.');
                      }}
                      className="flex-1 px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 transition-colors"
                    >
                      Create Course
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    <span className="inline-flex items-center">
                      <svg className="w-4 h-4 mr-1 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {courses.length} of your courses available
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={onRefreshCourses}
                    className="text-sm text-blue-500 hover:text-blue-700 underline flex items-center space-x-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Refresh</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quiz Type {isEditMode && <span className="text-xs text-amber-600">(Changing this will reset questions)</span>}
            </label>
            <select
              value={formData.quiz_type}
              onChange={(e) => {
                if (isEditMode && e.target.value !== formData.quiz_type) {
                  const confirmChange = window.confirm(
                    'Changing the quiz type will reset all questions. Are you sure you want to continue?'
                  );
                  if (confirmChange) {
                    handleInputChange('quiz_type', e.target.value);
                    setQuestions([]); // Clear questions when type changes in edit mode
                  }
                } else {
                  handleInputChange('quiz_type', e.target.value);
                }
              }}
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
            />
          </div>

          {/* Questions Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Questions</h3>
              <button
                type="button"
                onClick={addQuestion}
                className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Question</span>
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-gray-400 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-4">No questions added yet</p>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add Your First Question
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {questions.map((question, index) => (
                  <QuestionForm
                    key={`question-${isEditMode ? 'edit' : 'new'}-${question.id || index}`}
                    question={question}
                    index={index}
                    onUpdate={updateQuestion}
                    onRemove={removeQuestion}
                    quizType={formData.quiz_type}
                  />
                ))}
              </div>
            )}

            {questions.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700 font-medium">
                    {questions.length} question{questions.length !== 1 ? 's' : ''} added
                  </span>
                  <span className="text-blue-600">
                    Quiz Type: {formData.quiz_type?.toUpperCase().replace('_', ' ')}
                  </span>
                </div>
              </div>
            )}

            {/* JSON Preview for Development
            {questions.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 font-medium">
                  🔍 Preview JSON Payload (for development)
                </summary>
                <div className="mt-2 space-y-3">
                  <pre className="p-3 bg-gray-100 rounded-lg text-xs overflow-auto max-h-40 text-gray-700">
{JSON.stringify({
  course_id: formData.course_id,
  title: formData.title,
  description: formData.description,
  quiz_type: formData.quiz_type,
  duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
  max_attempts: formData.max_attempts ? parseInt(formData.max_attempts) : null,
  questions: questions.map(question => {
    const baseQuestion = {
      type: question.type,
      question: question.question
    };

    switch (question.type) {
      case 'mcq':
        return {
          ...baseQuestion,
          options: question.options?.filter(opt => opt.trim()) || [],
          correct_answer: question.options?.[parseInt(question.correct_answer)] || ''
        };
      case 'true_false':
        return {
          ...baseQuestion,
          correct_answer: question.correct_answer // Already validated as string
        };
      case 'fill_blanks':
        return {
          ...baseQuestion,
          correct_answer: question.correct_answer
        };
      case 'subjective':
        return {
          ...baseQuestion,
          expected_answer: question.expected_answer || ''
        };
      default:
        return baseQuestion;
    }
  })
}, null, 2)}
                  </pre>
                  
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const connectionOk = await testApiConnection();
                        alert(connectionOk ? '✅ API Connection: OK' : '❌ API Connection: Failed');
                      }}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Test API Connection
                    </button>
                    
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          // Create a minimal test payload to check backend expectations
                          const testPayload = {
                            course_id: 1, // Use a simple integer
                            title: "Test Quiz",
                            description: "",
                            quiz_guidelines: "",
                            quiz_type: "mcq",
                            duration_minutes: null,
                            max_attempts: null,
                            is_active: true,
                            questions: [{
                              type: "mcq",
                              question: "Test question?",
                              options: ["Option 1", "Option 2"],
                              correct_answer: "Option 1"
                            }]
                          };
                          
                          const token = localStorage.getItem('token');
                          console.log('🧪 Testing minimal payload:', testPayload);
                          
                          const response = await axios.post('http://localhost:4000/quizzes/', testPayload, {
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json',
                              'Accept': 'application/json'
                            },
                            timeout: 15000,
                            validateStatus: function (status) {
                              return status < 600; // Accept any status for debugging
                            }
                          });
                          
                          console.log('🧪 Test response status:', response.status);
                          console.log('🧪 Test response data:', response.data);
                          
                          if (response.status === 200 || response.status === 201) {
                            alert('✅ Test payload works! The issue is with your form data.');
                          } else {
                            alert(`❌ Test failed with status ${response.status}. Check console for details.`);
                          }
                          
                        } catch (error) {
                          console.error('🧪 Test payload error:', error);
                          alert(`❌ Test failed: ${error.response?.status} - ${error.response?.data?.detail || error.message}`);
                        }
                      }}
                      className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                    >
                      Test Minimal Payload
                    </button>
                    
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          // Create a test payload with true/false question similar to your format
                          const trueFalseTestPayload = {
                            course_id: formData.course_id || "68b171c81dcbcbe332b10957", // Use your course ID
                            title: "Test True/False Quiz",
                            description: "",
                            quiz_guidelines: "",
                            quiz_type: "true_false",
                            duration_minutes: 30,
                            max_attempts: 3,
                            is_active: true,
                            questions: [{
                              type: "true_false",
                              question: "This is a test true/false question?",
                              correct_answer: "true"  // Ensure it's a string
                            }]
                          };
                          
                          const token = localStorage.getItem('token');
                          console.log('🧪 Testing True/False payload:', JSON.stringify(trueFalseTestPayload, null, 2));
                          
                          const response = await axios.post('http://localhost:4000/quizzes/', trueFalseTestPayload, {
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json',
                              'Accept': 'application/json'
                            },
                            timeout: 15000,
                            validateStatus: function (status) {
                              return status < 600; // Accept any status for debugging
                            }
                          });
                          
                          console.log('🧪 True/False test response status:', response.status);
                          console.log('🧪 True/False test response data:', response.data);
                          
                          if (response.status === 200 || response.status === 201) {
                            alert('✅ True/False test payload works!');
                          } else {
                            alert(`❌ True/False test failed with status ${response.status}. Check console for details.`);
                          }
                          
                        } catch (error) {
                          console.error('🧪 True/False test payload error:', error);
                          alert(`❌ True/False test failed: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
                        }
                      }}
                      className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
                    >
                      Test True/False Payload
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const token = localStorage.getItem('token');
                        if (token) {
                          console.log('🔑 Current token (first 50 chars):', token.substring(0, 50) + '...');
                          console.log('🔑 Token length:', token.length);
                          
                          try {
                            const payload = JSON.parse(JSON.stringify({
                              course_id: parseInt(formData.course_id),
                              title: formData.title.trim(),
                              description: formData.description?.trim() || '',
                              quiz_guidelines: formData.quiz_guidelines?.trim() || '',
                              quiz_type: formData.quiz_type,
                              questions: questions
                            }));
                            console.log('📋 Test payload:', payload);
                            alert('Check console for token and payload details');
                          } catch (e) {
                            console.error('Error creating test payload:', e);
                            alert('Error creating test payload - check console');
                          }
                        } else {
                          alert('No token found');
                        }
                      }}
                      className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                    >
                      Debug Token & Payload
                    </button>
                  </div>
                </div>
              </details>
            )} */}
          </div>

          <div className="flex space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </span>
              ) : (isEditMode ? 'Update Quiz' : 'Create Quiz')}
            </button>
            <button
              type="button"
              onClick={onClose}
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

const InstructorQuizzes = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false); // Add loading state for courses
  const [coursesError, setCoursesError] = useState(''); // Add error state for courses
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null); // Add state for quiz being edited
  const [successMessage, setSuccessMessage] = useState('');
  const [courseQuizzes, setCourseQuizzes] = useState([]); // Store quizzes for specific course
  const successTimeoutRef = useRef(null);

  // Quiz statistics state
  const [quizStats, setQuizStats] = useState({
    totalQuizzes: 0,
    publishedQuizzes: 0,
    totalAttempts: 0,
    averageScore: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');

  // Quiz results state
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedQuizResults, setSelectedQuizResults] = useState(null);
  const [quizResults, setQuizResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState('');

  // Function to show success message with auto-hide
  const showSuccessMessage = useCallback((message) => {
    // Clear any existing timeout
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }

    setSuccessMessage(message);

    // Set new timeout
    successTimeoutRef.current = setTimeout(() => {
      setSuccessMessage('');
      successTimeoutRef.current = null;
    }, 5000); // Hide after 5 seconds
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // Function to view quiz results
  const handleViewResults = async (quiz) => {
    try {
      setResultsLoading(true);
      setResultsError('');
      const token = localStorage.getItem('token');

      if (!token) {
        setResultsError('Authentication token not found');
        return;
      }

      console.log(`🔍 Fetching results for quiz: ${quiz.title} (${quiz._id || quiz.id})`);

      const response = await axios.get(
        `http://localhost:4000/quizzes/${quiz._id || quiz.id}/results`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Quiz results response:', response.data);

      // Log the actual structure of quiz results for debugging
      if (response.data && response.data.length > 0) {
        console.log('📊 Sample quiz result structure:', response.data[0]);
        console.log('👤 Student info fields:', {
          student_name: response.data[0].student_name,
          user_name: response.data[0].user_name,
          name: response.data[0].name,
          student_email: response.data[0].student_email,
          user_email: response.data[0].user_email,
          email: response.data[0].email
        });
      }

      setQuizResults(response.data || []);
      setSelectedQuizResults(quiz);
      setShowResultsModal(true);

    } catch (error) {
      console.error('❌ Error fetching quiz results:', error);
      setResultsError(
        error.response?.data?.message ||
        error.response?.data?.detail ||
        'Failed to fetch quiz results'
      );
    } finally {
      setResultsLoading(false);
    }
  };

  // Remove mock data - now using API data only

  useEffect(() => {
    fetchQuizzes();
    fetchCourses();
    fetchQuizStats();
  }, []);

  // Update stats when quizzes data changes
  useEffect(() => {
    if (Array.isArray(quizzes) && quizzes.length > 0 && !statsLoading) {
      const totalQuizzes = quizzes.length;
      const publishedQuizzes = quizzes.filter(q => q.is_active || q.status === 'active').length;
      const totalAttempts = quizzes.reduce((sum, quiz) => sum + (quiz.attempts || 0), 0);
      const avgScore = quizzes.length > 0
        ? Math.round(quizzes.reduce((sum, quiz) => sum + (quiz.avgScore || 0), 0) / quizzes.length)
        : 0;

      // Only update if API call failed and we don't have API data
      if (statsError) {
        setQuizStats({
          totalQuizzes,
          publishedQuizzes,
          totalAttempts,
          averageScore: avgScore
        });
      }
    }
  }, [quizzes, statsLoading, statsError]);

  // Function to fetch quiz statistics
  const fetchQuizStats = async () => {
    setStatsLoading(true);
    setStatsError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token found for stats');
        setStatsError('Authentication required');
        return;
      }

      console.log('🔄 Fetching quiz statistics...');

      // Fetch quiz statistics from API
      const response = await axios.get('http://localhost:4000/quizzes/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Quiz stats response:', response.data);

      if (response.data) {
        setQuizStats({
          totalQuizzes: response.data.total_quizzes || 0,
          publishedQuizzes: response.data.published_quizzes || 0,
          totalAttempts: response.data.total_attempts || 0,
          averageScore: response.data.average_score || 0
        });
      }

    } catch (error) {
      console.error('❌ Error fetching quiz stats:', error);
      setStatsError('Failed to load quiz statistics');

      // Calculate stats from current quizzes data as fallback
      if (Array.isArray(quizzes) && quizzes.length > 0) {
        const totalQuizzes = quizzes.length;
        const publishedQuizzes = quizzes.filter(q => q.is_active || q.status === 'active').length;
        const totalAttempts = quizzes.reduce((sum, quiz) => sum + (quiz.attempts || 0), 0);
        const avgScore = quizzes.length > 0
          ? Math.round(quizzes.reduce((sum, quiz) => sum + (quiz.avgScore || 0), 0) / quizzes.length)
          : 0;

        setQuizStats({
          totalQuizzes,
          publishedQuizzes,
          totalAttempts,
          averageScore: avgScore
        });

        console.log('🔄 Using fallback stats calculation from quizzes data');
      }
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchCourses = async () => {
    setCoursesLoading(true);
    setCoursesError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token found');
        setCoursesError('Authentication required. Please log in again.');
        setCourses([]);
        return;
      }

      console.log('🔄 Fetching instructor-created courses from API...');
      console.log('🔑 Using token:', token.substring(0, 50) + '...');

      // Use the instructor-specific courses endpoint - only returns courses created by this instructor
      const response = await axios.get('http://localhost:4000/quizzes/instructor/courses', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // Add timeout for better UX
      });

      console.log('✅ Instructor courses response:', response);
      console.log('📊 Response status:', response.status);
      console.log('📋 Response data:', response.data);

      // Handle the correct response format from the API
      const coursesData = response.data?.courses || response.data || [];

      console.log('🔍 Extracted courses data:', coursesData);
      console.log('🔢 Courses array length:', coursesData.length);

      if (!Array.isArray(coursesData)) {
        console.error('❌ Invalid courses data format:', coursesData);
        setCoursesError('Invalid response format from server');
        setCourses([]);
        return;
      }

      if (coursesData.length === 0) {
        console.warn('⚠️ No courses found for this instructor');
        console.log('🔍 Full API response for debugging:', JSON.stringify(response.data, null, 2));
        setCoursesError('You haven\'t created any courses yet. Create a course first to add quizzes.');
        setCourses([]);
      } else {
        console.log(`✅ Found ${coursesData.length} courses created by this instructor:`);
        coursesData.forEach((course, index) => {
          console.log(`📚 Course ${index + 1}:`, {
            id: course.id,
            course_id: course.course_id,
            title: course.title,
            instructor: course.instructor,
            instructor_id: course.instructor_id
          });
        });
        setCourses(coursesData);
        setCoursesError('');
        console.log('🎯 Instructor courses successfully set in state');
      }

    } catch (error) {
      console.error('❌ Error fetching instructor courses:', error);

      let errorMessage = 'Failed to load your courses. ';

      if (error.response) {
        console.error('📊 Response status:', error.response.status);
        console.error('📋 Response data:', error.response.data);
        console.error('📝 Response headers:', error.response.headers);

        if (error.response.status === 403) {
          console.error('🚫 Access denied - user may not be an instructor');
          errorMessage += 'Access denied. You may not have instructor privileges.';
        } else if (error.response.status === 401) {
          console.error('🔐 Authentication failed - token may be invalid');
          errorMessage += 'Authentication failed. Please log in again.';
        } else if (error.response.status === 404) {
          console.error('🔍 Endpoint not found');
          errorMessage += 'Service endpoint not found. Please contact support.';
        } else if (error.response.status >= 500) {
          console.error('🚨 Server error');
          errorMessage += 'Server error. Please try again later.';
        } else {
          errorMessage += `Server returned error: ${error.response.status}`;
        }
      } else if (error.request) {
        console.error('🌐 Network error - no response received:', error.request);
        errorMessage += 'Network error. Please check your connection and try again.';
      } else if (error.code === 'ECONNABORTED') {
        console.error('⏱️ Request timeout');
        errorMessage += 'Request timeout. Please try again.';
      } else {
        console.error('⚡ Request setup error:', error.message);
        errorMessage += 'Request failed. Please try again.';
      }

      setCoursesError(errorMessage);
      setCourses([]);
      console.log('🔄 Set empty courses array due to API error');
    } finally {
      setCoursesLoading(false);
    }
  };

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No token found');
        setQuizzes([]);
        return;
      }

      console.log('🔄 Fetching quizzes with token:', token.substring(0, 20) + '...');
      const response = await axios.get('http://localhost:4000/quizzes/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Quizzes response:', response.data);

      // Handle the correct response format - API returns an array directly
      const quizzesData = Array.isArray(response.data) ? response.data : [];

      // Map the API data to include status based on quiz properties
      const mappedQuizzes = quizzesData.map(quiz => ({
        ...quiz,
        // Determine active/inactive status
        is_active: quiz.status === 'active' || quiz.is_active === true,
        // Ensure we have a proper _id field
        _id: quiz._id || quiz.id
      }));

      setQuizzes(mappedQuizzes);
      console.log('✅ Quizzes set:', mappedQuizzes);

      // Refresh stats after fetching quizzes
      fetchQuizStats();
    } catch (error) {
      console.error('❌ Error fetching quizzes:', error);
      if (error.response) {
        console.error('Response error:', error.response.status, error.response.data);
      }
      // Set empty array on error instead of mock data
      setQuizzes([]);
      console.log('🔄 Set empty quizzes array due to API error');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = filterCourse === 'all' || quiz.course_id?.toString() === filterCourse?.toString();

    return matchesSearch && matchesCourse;
  });

  const QuizCard = ({ quiz, onEditQuiz }) => {
    // Find the course name for this quiz using the id field from courses
    const courseName = (courses || []).find(course => {
      const courseId = course.id;
      return courseId === quiz.course_id;
    })?.title || 'Unknown Course';

    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{quiz.title}</h3>
            <p className="text-gray-600 text-sm">{courseName}</p>
          </div>
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${quiz.is_active
            ? 'bg-orange-100 text-orange-700'
            : 'bg-red-100 text-red-700'
            }`}>
            {quiz.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{quiz.questions?.length || 0}</div>
            <div className="text-xs text-gray-500">Questions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">{quiz.duration_minutes ? `${quiz.duration_minutes}m` : 'Unlimited'}</div>
            <div className="text-xs text-gray-500">Duration</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">{quiz.max_attempts || 'Unlimited'}</div>
            <div className="text-xs text-gray-500">Max Attempts</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">{quiz.quiz_type?.toUpperCase() || 'MCQ'}</div>
            <div className="text-xs text-gray-500">Type</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>Type: {quiz.quiz_type || 'MCQ'}</span>
          <span>Created: {quiz.created_at ? new Date(quiz.created_at).toLocaleDateString() : 'N/A'}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEditQuiz(quiz)}
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1.5"
            title="Edit this quiz"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit Quiz</span>
          </button>
          <button
            onClick={() => handleViewResults(quiz)}
            className="px-4 py-2 bg-orange-100 text-orange-700 text-sm rounded-lg hover:bg-orange-200 transition-colors flex items-center space-x-1.5"
            disabled={resultsLoading}
            title="View quiz results and student attempts"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>{resultsLoading ? 'Loading...' : 'View Results'}</span>
          </button>
          <button className="px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors">
            <span className="text-lg">⋯</span>
          </button>
        </div>
      </div>
    );
  };

  // Function to fetch quizzes for a specific course
  const fetchQuizzesForCourse = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No authentication token found');
        return [];
      }

      console.log(`🔄 Fetching quizzes for course ${courseId}...`);

      const response = await axios.get(`http://localhost:4000/quizzes/course/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Course quizzes response:', response.data);

      // Handle the response format - API should return an array of quizzes for the course
      const courseQuizzesData = Array.isArray(response.data) ? response.data : [];

      // Map the API data to ensure consistent format
      const mappedCourseQuizzes = courseQuizzesData.map(quiz => ({
        ...quiz,
        is_active: quiz.status === 'active' || quiz.is_active === true,
        _id: quiz._id || quiz.id
      }));

      // Update the courseQuizzes state
      setCourseQuizzes(mappedCourseQuizzes);

      console.log(`✅ Found ${mappedCourseQuizzes.length} quizzes for course ${courseId}`);
      return mappedCourseQuizzes;

    } catch (error) {
      console.error(`❌ Error fetching quizzes for course ${courseId}:`, error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }

      // Clear courseQuizzes state on error
      setCourseQuizzes([]);
      return [];
    }
  };

  const handleQuizCreated = async (createdQuizData = null) => {
    console.log('🔄 handleQuizCreated called with:', createdQuizData);

    // Refresh quiz lists
    await fetchQuizzes();
    await fetchQuizStats();

    // If quiz data is provided and includes course_id, fetch course-specific quizzes
    if (createdQuizData && createdQuizData.course_id) {
      console.log(`🎯 Fetching quizzes for course: ${createdQuizData.course_id}`);
      const courseQuizzesData = await fetchQuizzesForCourse(createdQuizData.course_id);

      // Find course name for better messaging
      const courseName = courses.find(course => course.id === createdQuizData.course_id)?.title || 'Selected Course';

      const action = editingQuiz ? 'updated' : 'created';
      showSuccessMessage(
        `Quiz "${createdQuizData.title}" ${action} successfully! ` +
        `Found ${courseQuizzesData.length} quiz${courseQuizzesData.length !== 1 ? 'es' : ''} for "${courseName}".`
      );
    } else {
      const action = editingQuiz ? 'updated' : 'created';
      showSuccessMessage(`Quiz ${action} successfully!`);
    }

    // Clear editing state
    setEditingQuiz(null);
  };

  // Function to handle opening the modal for creating a new quiz
  const handleCreateQuiz = () => {
    setEditingQuiz(null);
    setShowCreateModal(true);
  };

  // Function to handle opening the modal for editing an existing quiz
  const handleEditQuiz = async (quiz) => {
    console.log('🎯 handleEditQuiz called with quiz:', quiz);
    console.log('🔍 Quiz ID to edit:', quiz._id || quiz.id);

    // Set the editing quiz and open modal immediately to show loading state
    setEditingQuiz(quiz);
    setShowCreateModal(true);

    // The CreateQuizModal component will handle fetching fresh data via fetchQuizForEdit
    // This ensures we always get the latest quiz data from the API
  };

  // Function to close the modal
  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingQuiz(null);
  };

  // Function to manually fetch quizzes for currently selected course filter
  const fetchCurrentCourseQuizzes = async () => {
    if (filterCourse && filterCourse !== 'all') {
      console.log(`🔄 Manual refresh for course: ${filterCourse}`);
      await fetchQuizzesForCourse(filterCourse);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-400 text-orange-800 px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 transform transition-all duration-500 ease-out animate-pulse">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg">{successMessage}</p>
          </div>
          <button
            onClick={() => {
              if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current);
                successTimeoutRef.current = null;
              }
              setSuccessMessage('');
            }}
            className="flex-shrink-0 text-orange-600 hover:text-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 rounded-full p-1 transition-colors duration-200"
            title="Close message"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quiz Management</h1>

          {!coursesLoading && !coursesError && Array.isArray(courses) && (
            <p className="text-sm text-blue-600 mt-1">
            </p>
          )}
          {coursesError && (
            <p className="text-sm text-red-600 mt-1">
              ❌ Unable to load your courses
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCreateQuiz}
            disabled={coursesLoading || (Array.isArray(courses) && courses.length === 0)}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            title={
              coursesLoading
                ? "Loading courses..."
                : (Array.isArray(courses) && courses.length === 0)
                  ? "Create a course first to add quizzes"
                  : "Create a new quiz"
            }
          >
            <span>+</span>
            <span>Create Quiz</span>
          </button>
        </div>
      </div>

      {/* No Courses Notice */}
      {!coursesLoading && !coursesError && Array.isArray(courses) && courses.length === 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-6 rounded-lg shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">
                No Courses Found
              </h3>
              <p className="text-yellow-700 mb-4">
                You need to create a course before you can add quizzes to it. Quizzes can only be created for courses that you have authored as an instructor.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    // You could add navigation logic here
                    alert('Please navigate to Course Management to create your first course.');
                  }}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                >
                  Go to Course Management
                </button>
                <button
                  onClick={fetchCourses}
                  className="px-4 py-2 bg-white text-yellow-700 border border-yellow-300 rounded-lg hover:bg-yellow-50 transition-colors font-medium"
                >
                  Refresh Courses
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courses Loading Error */}
      {!coursesLoading && coursesError && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 p-6 rounded-lg shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-red-800 mb-2">
                Failed to Load Courses
              </h3>
              <p className="text-red-700 mb-4">
                {coursesError}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={fetchCourses}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    // Clear error and show empty state
                    setCoursesError('');
                    setCourses([]);
                  }}
                  className="px-4 py-2 bg-white text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors font-medium"
                >
                  Clear Error
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Search Input */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Quizzes
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by quiz title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Course Filter */}
          <div className="lg:w-80">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="w-full pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer transition-all duration-200 hover:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={coursesLoading}
              >
                <option value="all" className="py-2 px-3 text-gray-900">
                  🎯 All Your Courses ({Array.isArray(courses) ? courses.length : 0})
                </option>
                {coursesLoading ? (
                  <option disabled className="py-2 px-3 text-gray-500">
                    Loading your courses...
                  </option>
                ) : coursesError ? (
                  <option disabled className="py-2 px-3 text-red-500">
                    Error loading courses
                  </option>
                ) : Array.isArray(courses) && courses.length > 0 ? (
                  courses.map(course => {
                    const courseId = course.id;
                    return (
                      <option
                        key={courseId}
                        value={courseId}
                        className="py-2 px-3 text-gray-900"
                      >
                        📚 {course.title || 'Untitled Course'}
                      </option>
                    );
                  })
                ) : (
                  <option disabled className="py-2 px-3 text-yellow-600">
                    You haven't created any courses yet
                  </option>
                )}
              </select>
              {/* Custom dropdown arrow */}
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Course count and refresh button */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {coursesLoading ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : coursesError ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    ❌ Error loading courses
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    ✅ {Array.isArray(courses) ? courses.length : 0} courses loaded
                  </span>
                )}

                {filterCourse !== 'all' && !coursesLoading && (
                  <button
                    onClick={() => setFilterCourse('all')}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear filter
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  console.log('🔄 Manual refresh courses triggered');
                  fetchCourses();
                }}
                disabled={coursesLoading}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh courses list"
              >
                <svg className={`w-3 h-3 mr-1 ${coursesLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>

              {/* Course-specific quizzes fetch button */}
              {filterCourse && filterCourse !== 'all' && !coursesLoading && (
                <button
                  onClick={fetchCurrentCourseQuizzes}
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 transition-colors ml-2"
                  title="Fetch quizzes for selected course"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Course Quizzes
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || filterCourse !== 'all') && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-sm text-gray-600 font-medium">Active filters:</span>

              {searchTerm && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 transition-colors"
                  >
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              )}

              {filterCourse !== 'all' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Course: {courses.find(c => {
                    const courseId = c.id;
                    return courseId?.toString() === filterCourse;
                  })?.title || 'Unknown'}
                  <button
                    onClick={() => setFilterCourse('all')}
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-orange-200 transition-colors"
                  >
                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              )}

              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterCourse('all');
                }}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Course-specific Quiz Information */}
      {courseQuizzes.length > 0 && filterCourse !== 'all' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-blue-600">📚</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900">
                  {courses.find(c => {
                    const courseId = c.id || c.course_id;
                    return courseId?.toString() === filterCourse?.toString();
                  })?.title || 'Selected Course'} Quizzes
                </h3>
                <p className="text-blue-700 text-sm">
                  Found {courseQuizzes.length} quiz{courseQuizzes.length !== 1 ? 'es' : ''} for this course
                </p>
              </div>
            </div>
            <button
              onClick={() => setCourseQuizzes([])}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg p-2 transition-colors"
              title="Hide course quiz details"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{courseQuizzes.length}</div>
              <div className="text-sm text-gray-600">Total Quizzes</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {courseQuizzes.filter(q => q.is_active).length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {courseQuizzes.reduce((sum, quiz) => sum + (quiz.questions?.length || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Questions</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {new Set(courseQuizzes.map(q => q.quiz_type)).size}
              </div>
              <div className="text-sm text-gray-600">Quiz Types</div>
            </div>
          </div>

          {courseQuizzes.length > 0 && (
            <div className="mt-4 text-sm text-blue-700">
              <strong>Quiz Types:</strong> {Array.from(new Set(courseQuizzes.map(q => q.quiz_type || 'MCQ'))).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Quiz Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statsLoading ? (
          // Loading state for stats
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
              </div>
            </div>
          ))
        ) : statsError ? (
          // Error state for stats
          <div className="col-span-full bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <span className="text-red-600">⚠️</span>
                </div>
                <div>
                  <h3 className="text-red-800 font-medium">Failed to load statistics</h3>
                  <p className="text-red-600 text-sm">{statsError}</p>
                </div>
              </div>
              <button
                onClick={fetchQuizStats}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          // Statistics cards
          <>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Quizzes</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{quizStats.totalQuizzes}</p>
                  <p className="text-xs text-gray-400 mt-1">All created quizzes</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="text-xl text-blue-600">📝</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Published Quizzes</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{quizStats.publishedQuizzes}</p>
                  <p className="text-xs text-gray-400 mt-1">Active & available</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <span className="text-xl text-orange-600">✅</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Attempts</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{quizStats.totalAttempts}</p>
                  <p className="text-xs text-gray-400 mt-1">Student submissions</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <span className="text-xl text-purple-600">🎯</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Average Score</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">{quizStats.averageScore}%</p>
                  <p className="text-xs text-gray-400 mt-1">Overall performance</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <span className="text-xl text-yellow-600">📊</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Refresh Stats Button */}
        {!statsLoading && !statsError && (
          <div className="col-span-full flex justify-end mt-2">
          </div>
        )}
      </div>

      {/* Quizzes List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading quizzes...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredQuizzes.length > 0 ? (
            filteredQuizzes.map(quiz => (
              <QuizCard key={quiz._id} quiz={quiz} onEditQuiz={handleEditQuiz} />
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 text-lg">No quizzes found</p>
              <p className="text-gray-400 mt-2">Try adjusting your search or create a new quiz</p>
              <button
                onClick={handleCreateQuiz}
                className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Create Your First Quiz
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Quiz Modal */}
      <CreateQuizModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        courses={courses}
        coursesLoading={coursesLoading}
        coursesError={coursesError}
        onRefreshCourses={fetchCourses}
        onQuizCreated={handleQuizCreated}
        editQuiz={editingQuiz}
      />

      {/* Quiz Results Modal */}
      {showResultsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Quiz Results: {selectedQuizResults?.title}
                </h3>
                <p className="text-gray-600 mt-1">
                  Total Attempts: {quizResults.length} | Course: {selectedQuizResults?.course_name || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setShowResultsModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {resultsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                    </svg>
                    <p className="text-red-700 font-medium">Error Loading Results</p>
                  </div>
                  <p className="text-red-600 mt-1">{resultsError}</p>
                </div>
              )}

              {resultsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600">Loading quiz results...</span>
                </div>
              ) : quizResults.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">No Results Yet</h4>
                  <p className="text-gray-600">
                    No students have attempted this quiz yet. Results will appear here once students start taking the quiz.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Summary Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {quizResults.length}
                      </div>
                      <div className="text-sm text-blue-800">Total Attempts</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-orange-600">
                        {quizResults.length > 0 ?
                          Math.round(quizResults.reduce((acc, result) => acc + result.score, 0) / quizResults.length)
                          : 0}%
                      </div>
                      <div className="text-sm text-orange-800">Average Score</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.max(...quizResults.map(r => r.score || 0), 0)}%
                      </div>
                      <div className="text-sm text-purple-800">Highest Score</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-yellow-600">
                        {quizResults.filter(r => (r.score || 0) >= 70).length}
                      </div>
                      <div className="text-sm text-yellow-800">Passed (≥70%)</div>
                    </div>
                  </div>

                  {/* Results Table */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Student
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Score
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Points
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Time Taken
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Submitted At
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {quizResults.map((result, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                                    <span className="text-sm font-medium text-gray-600">
                                      {(result.student_name || result.user_name || result.name || 'A').charAt(0)}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {result.student_name || result.user_name || result.name || 'Anonymous Student'}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {result.student_email || result.user_email || result.email || 'N/A'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(result.score || 0) >= 80 ? 'bg-orange-100 text-orange-800' :
                                  (result.score || 0) >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                    (result.score || 0) >= 50 ? 'bg-orange-100 text-orange-800' :
                                      'bg-red-100 text-red-800'
                                  }`}>
                                  {result.score || 0}%
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {result.points_earned || 0} / {result.total_points || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {result.time_taken ? `${Math.floor((result.time_taken || 0) / 60)}m ${((result.time_taken || 0) % 60)}s` : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {result.submitted_at ? new Date(result.submitted_at).toLocaleString() : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${result.status === 'completed' ? 'bg-orange-100 text-orange-800' :
                                  result.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                  {result.status || 'completed'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => setShowResultsModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorQuizzes;
