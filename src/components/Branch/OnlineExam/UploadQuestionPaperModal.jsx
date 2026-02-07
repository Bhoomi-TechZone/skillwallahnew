import { useState, useEffect } from 'react';
import { FaUpload, FaTimes, FaFileAlt, FaSpinner } from 'react-icons/fa';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000';

const UploadQuestionPaperModal = ({ isOpen, onClose, paperSet, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [questions, setQuestions] = useState([{
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    marks: paperSet?.perQuestionMark || 1,
    negative_marks: paperSet?.minusMarking || 0,
    subject: paperSet?.subject || '',
    course: paperSet?.course || ''
  }]);

  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(paperSet?.subject || '');
  const [selectedCourse, setSelectedCourse] = useState(paperSet?.course || '');

  // Fetch available subjects & courses for selectors (must run on every render regardless of isOpen)
  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/questions/filters/options`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res?.data?.success && res.data.filters) {
        const rawSubjects = res.data.filters.subjects || [];
        const rawCourses = res.data.filters.courses || [];

        const normalize = (v) => {
          if (v === undefined || v === null) return '';
          if (typeof v === 'string') return v.trim();
          if (typeof v === 'object') {
            return String(v.name ?? v.title ?? v.display_name ?? v.course ?? v.course_name ?? JSON.stringify(v));
          }
          return String(v);
        };

        const subjectsList = Array.from(new Set(rawSubjects.map(normalize).filter(s => s)));
        const coursesList = Array.from(new Set(rawCourses.map(normalize).filter(c => c)));

        console.log('Filter options received', { rawSubjects, rawCourses, subjectsList, coursesList });

        setSubjects(subjectsList);
        setCourses(coursesList);

        // If there is a default in paperSet, prefer that only if present in the list
        if (paperSet?.subject && subjectsList.includes(paperSet.subject)) setSelectedSubject(paperSet.subject);
        if (paperSet?.course && coursesList.includes(paperSet.course)) setSelectedCourse(paperSet.course);
      }
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  };

  useEffect(() => {
    if (isOpen) fetchFilterOptions();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    setQuestions([...questions, {
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A',
      marks: paperSet?.perQuestionMark || 1,
      negative_marks: paperSet?.minusMarking || 0,
      subject: selectedSubject || paperSet?.subject || '',
      course: selectedCourse || paperSet?.course || ''
    }]);
  };

  const handleRemoveQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      alert('Please upload a JSON file');
      return;
    }

    try {
      const text = await file.text();
      const parsedQuestions = JSON.parse(text);

      if (Array.isArray(parsedQuestions)) {
        // Ensure each question has subject/course (use selected or paperSet defaults)
        const filled = parsedQuestions.map((q, i) => ({
          question_text: q.question_text ?? q.question ?? '',
          option_a: q.option_a ?? q.a ?? q.optionA ?? '',
          option_b: q.option_b ?? q.b ?? q.optionB ?? '',
          option_c: q.option_c ?? q.c ?? q.optionC ?? '',
          option_d: q.option_d ?? q.d ?? q.optionD ?? '',
          correct_answer: q.correct_answer ?? q.correctAnswer ?? 'A',
          marks: q.marks ?? paperSet?.perQuestionMark ?? 1,
          negative_marks: q.negative_marks ?? q.negativeMarks ?? paperSet?.minusMarking ?? 0,
          subject: q.subject ?? selectedSubject ?? paperSet?.subject ?? '',
          course: q.course ?? selectedCourse ?? paperSet?.course ?? ''
        }));

        setQuestions(filled);
      } else {
        alert('Invalid JSON format. Expected an array of questions.');
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
      alert('Error parsing JSON file');
    }
  };

  const handleSubmit = async () => {
    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    // Ensure subject & course are provided either globally or per-question
    if (!selectedSubject && !questions.some(q => q.subject)) {
      alert('Please select a Subject (or include subject per question)');
      return;
    }
    if (!selectedCourse && !questions.some(q => q.course)) {
      alert('Please select a Course (or include course per question)');
      return;
    }

    const invalidQuestions = questions.filter(q =>
      !q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d || !(q.subject || selectedSubject) || !(q.course || selectedCourse)
    );

    if (invalidQuestions.length > 0) {
      alert('Please fill all fields for all questions and ensure Subject & Course are provided');
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('access_token');

      const payload = {
        paper_set_id: paperSet.id,
        questions: questions.map((q, index) => ({
          question_number: index + 1,
          paper_set_id: paperSet.id,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer || 'A',
          marks: q.marks || paperSet?.perQuestionMark || 1,
          negative_marks: q.negative_marks || paperSet?.minusMarking || 0,
          subject: q.subject || selectedSubject || paperSet?.subject || '',
          course: q.course || selectedCourse || paperSet?.course || '',
          difficulty: q.difficulty || 'medium',
          explanation: q.explanation || ''
        }))
      };

      console.log('📤 Uploading questions:', payload);

      const response = await axios.post(
        `${API_BASE_URL}/api/questions/bulk-create`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Upload response:', response.data);
      alert(`Successfully uploaded ${questions.length} questions!`);
      onUploadSuccess();
      onClose();

    } catch (error) {
      console.error('❌ Upload error:', error);
      alert('Error uploading questions: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <FaFileAlt className="w-5 h-5 sm:w-6 sm:h-6" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Upload Questions</h2>
              <p className="text-xs sm:text-sm text-blue-100 truncate max-w-[200px] sm:max-w-md">{paperSet?.paperName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors focus:outline-none"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* Course & Subject selectors */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">-- Select Course --</option>
                {courses.map((c, idx) => (
                  <option key={idx} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">-- Select Subject --</option>
                {subjects.map((s, idx) => (
                  <option key={idx} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload JSON File Option */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center text-sm sm:text-base">
              <FaUpload className="mr-2" />
              Quick Upload (JSON)
            </h3>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="w-full text-sm"
            />
            <p className="text-xs text-gray-600 mt-2">
              Upload a JSON file with questions. Format: [{"{'question_text': '...', 'option_a': '...', 'option_b': '...', 'option_c': '...', 'option_d': '...', 'correct_answer': 'A'"}]
            </p>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Question {index + 1}</h4>
                  {questions.length > 1 && (
                    <button
                      onClick={() => handleRemoveQuestion(index)}
                      className="text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question Text *
                    </label>
                    <textarea
                      value={question.question_text}
                      onChange={(e) => handleQuestionChange(index, 'question_text', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      rows="2"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option A *</label>
                      <input
                        type="text"
                        value={question.option_a}
                        onChange={(e) => handleQuestionChange(index, 'option_a', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option B *</label>
                      <input
                        type="text"
                        value={question.option_b}
                        onChange={(e) => handleQuestionChange(index, 'option_b', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option C *</label>
                      <input
                        type="text"
                        value={question.option_c}
                        onChange={(e) => handleQuestionChange(index, 'option_c', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option D *</label>
                      <input
                        type="text"
                        value={question.option_d}
                        onChange={(e) => handleQuestionChange(index, 'option_d', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                      <select
                        value={question.correct_answer}
                        onChange={(e) => handleQuestionChange(index, 'correct_answer', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marks</label>
                      <input
                        type="number"
                        value={question.marks}
                        onChange={(e) => handleQuestionChange(index, 'marks', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Negative Marks</label>
                      <input
                        type="number"
                        value={question.negative_marks}
                        onChange={(e) => handleQuestionChange(index, 'negative_marks', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        min="0"
                        step="0.25"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <select
                        value={question.subject || selectedSubject}
                        onChange={(e) => handleQuestionChange(index, 'subject', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">-- Select Subject --</option>
                        {subjects.map((s, idx) => (
                          <option key={idx} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                      <select
                        value={question.course || selectedCourse}
                        onChange={(e) => handleQuestionChange(index, 'course', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">-- Select Course --</option>
                        {courses.map((c, idx) => (
                          <option key={idx} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddQuestion}
            className="mt-4 w-full py-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
          >
            + Add Another Question
          </button>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t gap-4 shrink-0">
          <div className="text-sm text-gray-600">
            Total Questions: <span className="font-bold">{questions.length}</span>
          </div>
          <div className="flex w-full sm:w-auto space-x-3">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <FaSpinner className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <FaUpload className="w-4 h-4" />
                  <span>Upload Questions</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadQuestionPaperModal;
