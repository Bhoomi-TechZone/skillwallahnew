import { useState, useEffect, useRef } from 'react';
import { FaQuestion, FaPlus, FaEdit, FaTrash, FaSearch, FaEye, FaUpload, FaDownload, FaFileImport, FaCheckCircle, FaTimes, FaFilter, FaEllipsisV } from 'react-icons/fa';
import BranchLayout from '../BranchLayout';
import { questionService } from '../../../services/questionService';

const AdminQuestion = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false); // Mobile filter toggle
  const fileInputRef = useRef(null);

  // Filter options from API
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const difficulties = ['Easy', 'Medium', 'Hard'];

  // Form state for question creation/editing
  const [formData, setFormData] = useState({
    question_text: '',
    explanation: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    subject: '',
    course: '',
    difficulty: 'Easy',
    marks: 1
  });

  // Load questions from API
  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check authentication
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication required. Please login again.');
        setLoading(false);
        return;
      }

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

      if (response && Array.isArray(response)) {
        // Handle direct array response format
        console.log(`✅ Loaded ${response.length} questions directly`);

        const questionsData = response.map(q => ({
          id: q.id || q._id,
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
          created_by: q.created_by,
          updated_at: q.updated_at
        }));

        setQuestions(questionsData);
        setTotalQuestions(response.length);
        setTotalPages(Math.ceil(response.length / itemsPerPage));
      } else if (response && response.success) {
        // Handle wrapped response format
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
          created_by: q.created_by,
          updated_at: q.updated_at
        }));

        setQuestions(questionsData);
        setTotalQuestions(response.total || response.questions.length);
        setTotalPages(response.total_pages || Math.ceil((response.total || response.questions.length) / itemsPerPage));
      } else {
        console.warn('⚠️ Unexpected API response format:', response);
        setQuestions([]);
        setTotalQuestions(0);
        setTotalPages(1);
        setError('No questions found or unexpected response format');
      }
    } catch (error) {
      console.error('❌ Error loading questions:', error);
      setError(error.message || 'Failed to load questions. Please try again.');
      setQuestions([]);
      setTotalQuestions(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Load filter options from API
  const loadFilterOptions = async () => {
    try {
      console.log('🔍 Loading filter options...');
      const response = await questionService.getFilterOptions();

      if (response.success && response.filters) {
        setSubjects(response.filters.subjects?.length > 0 ? response.filters.subjects : [
          'Computer Science', 'Programming', 'Database', 'Networking', 'Web Development',
          'Data Science', 'Machine Learning', 'Software Engineering', 'Cyber Security'
        ]);

        setCourses(response.filters.courses?.length > 0 ? response.filters.courses : [
          'BCA', 'MCA', 'BBA', 'MBA', 'B.Tech', 'M.Tech', 'DCA', 'ADCA'
        ]);
      } else {
        // Fallback options
        setSubjects(['Computer Science', 'Programming', 'Database', 'Networking', 'Web Development']);
        setCourses(['BCA', 'MCA', 'BBA', 'MBA']);
      }
    } catch (error) {
      console.error('❌ Error loading filter options:', error);
      // Fallback
      setSubjects(['Computer Science', 'Programming', 'Database', 'Networking', 'Web Development']);
      setCourses(['BCA', 'MCA', 'BBA', 'MBA']);
    }
  };

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [currentPage, searchTerm, subjectFilter, courseFilter, difficultyFilter]);

  // Handle create new question
  const handleCreate = () => {
    setFormData({
      question_text: '',
      explanation: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A',
      subject: '',
      course: '',
      difficulty: 'Easy',
      marks: 1
    });
    setSelectedQuestion(null);
    setShowModal(true);
  };

  // Handle edit question
  const handleEdit = (question) => {
    setFormData({
      question_text: question.questionText,
      explanation: question.explanation || '',
      option_a: question.optionA,
      option_b: question.optionB,
      option_c: question.optionC,
      option_d: question.optionD,
      correct_answer: question.correctAnswer,
      subject: question.subject,
      course: question.course,
      difficulty: question.difficulty,
      marks: question.marks
    });
    setSelectedQuestion(question);
    setShowModal(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (selectedQuestion) {
        // Update existing question
        const response = await questionService.updateQuestion(selectedQuestion.id, formData);
        if (response.success) {
          setShowModal(false);
          await loadQuestions();
        } else {
          throw new Error(response.message || 'Failed to update question');
        }
      } else {
        // Create new question
        const response = await questionService.createQuestion(formData);
        if (response.success) {
          setShowModal(false);
          setCurrentPage(1);
          await loadQuestions();
        } else {
          throw new Error(response.message || 'Failed to create question');
        }
      }
    } catch (error) {
      console.error('❌ Error saving question:', error);
      alert(error.message || 'Failed to save question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete question
  const handleDelete = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        setLoading(true);
        const response = await questionService.deleteQuestion(questionId);
        if (response.success) {
          await loadQuestions();
        } else {
          throw new Error(response.message || 'Failed to delete question');
        }
      } catch (error) {
        console.error('❌ Error deleting question:', error);
        alert(error.message || 'Failed to delete question. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle preview
  const handlePreview = (question) => {
    setSelectedQuestion(question);
    setShowPreviewModal(true);
  };

  // Handle CSV import
  const handleCsvImport = async () => {
    if (!csvFile) {
      alert('Please select a CSV file first');
      return;
    }

    try {
      setImporting(true);
      console.log('🔄 Starting CSV import for file:', csvFile.name);
      
      // Read and parse CSV file
      const csvText = await readFileAsText(csvFile);
      const questions = await parseCsvQuestions(csvText);
      
      if (questions.length === 0) {
        alert('No valid questions found in the CSV file. Please check the format and try again.');
        return;
      }

      console.log(`📊 Parsed ${questions.length} questions from CSV`);
      
      // Import questions in batches
      let successCount = 0;
      let failureCount = 0;
      const batchSize = 10;
      
      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);
        console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} questions)`);
        
        for (const questionData of batch) {
          try {
            const response = await questionService.createQuestion(questionData);
            if (response.success) {
              successCount++;
              console.log(`✅ Question created: "${questionData.question_text.substring(0, 50)}..."`);
            } else {
              failureCount++;
              console.warn(`❌ Failed to create question: ${response.message}`);
            }
          } catch (error) {
            failureCount++;
            console.error(`❌ Error creating question:`, error);
          }
        }
        
        // Small delay between batches to avoid overwhelming the server
        if (i + batchSize < questions.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Show results
      const totalQuestions = successCount + failureCount;
      let resultMessage = `Import completed!\n\n`;
      resultMessage += `✅ Successfully imported: ${successCount} questions\n`;
      if (failureCount > 0) {
        resultMessage += `❌ Failed to import: ${failureCount} questions\n`;
      }
      resultMessage += `📊 Total processed: ${totalQuestions} questions`;
      
      alert(resultMessage);
      
      // Reload questions to show newly imported ones
      setCurrentPage(1);
      await loadQuestions();
      
    } catch (error) {
      console.error('❌ Error importing CSV:', error);
      
      let errorMessage = `Failed to import CSV: ${error.message}`;
      
      // Add helpful suggestions based on common errors
      if (error.message.includes('Missing required columns')) {
        errorMessage += '\n\n💡 Tips:\n';
        errorMessage += '• Download the sample CSV to see the correct format\n';
        errorMessage += '• Make sure your CSV has headers: question, option_a, option_b, option_c, option_d, correct_answer\n';
        errorMessage += '• Check that column names match exactly (case-insensitive)\n';
        errorMessage += '• Ensure there are no extra spaces or special characters in headers';
      } else if (error.message.includes('header row')) {
        errorMessage += '\n\n💡 Your CSV file should have at least 2 rows (header + data)';
      }
      
      alert(errorMessage);
    } finally {
      setImporting(false);
      setCsvFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Test CSV headers to help with debugging
  const handleCsvTest = async () => {
    if (!csvFile) {
      alert('Please select a CSV file first');
      return;
    }

    try {
      const csvText = await readFileAsText(csvFile);
      const lines = csvText.trim().split('\n');
      
      if (lines.length === 0) {
        alert('CSV file appears to be empty');
        return;
      }
      
      const rawHeaders = parseCsvLine(lines[0]);
      
      let message = `CSV File Analysis:\n\n`;
      message += `📁 File: ${csvFile.name}\n`;
      message += `📏 Total rows: ${lines.length}\n`;
      message += `📋 Headers found (${rawHeaders.length}):\n\n`;
      
      rawHeaders.forEach((header, index) => {
        message += `${index + 1}. "${header}"\n`;
      });
      
      message += '\n🔍 Required headers for import:\n';
      message += '• question (or question_text, problem)\n';
      message += '• option_a (or option a, choice_a)\n';
      message += '• option_b (or option b, choice_b)\n';
      message += '• option_c (or option c, choice_c)\n';
      message += '• option_d (or option d, choice_d)\n';
      message += '• correct_answer (or answer, correct)\n';
      
      alert(message);
      
    } catch (error) {
      alert(`Error analyzing CSV: ${error.message}`);
    }
  };

  // Helper function to read file as text
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Helper function to parse CSV questions
  const parseCsvQuestions = async (csvText) => {
    const lines = csvText.trim().split('\n');
    const questions = [];
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }
    
    // Parse header to determine column positions with better cleaning
    const rawHeaders = parseCsvLine(lines[0]); // Use the CSV parsing function for headers too
    const headers = rawHeaders.map(h => h.trim().replace(/[\"'`]/g, '').toLowerCase());
    console.log('📋 Raw CSV Headers:', rawHeaders);
    console.log('📋 Cleaned CSV Headers:', headers);
    
    // Expected headers (flexible matching with more variations)
    const columnMap = {
      question: findColumnIndex(headers, [
        'question', 'question_text', 'question text', 'questiontext', 'q', 'problem', 'statement'
      ]),
      option_a: findColumnIndex(headers, [
        'option_a', 'option a', 'optiona', 'choice_a', 'choice a', 'choicea', 'a', 'opt_a', 'opta', '1st option', 'first option'
      ]),
      option_b: findColumnIndex(headers, [
        'option_b', 'option b', 'optionb', 'choice_b', 'choice b', 'choiceb', 'b', 'opt_b', 'optb', '2nd option', 'second option'
      ]),
      option_c: findColumnIndex(headers, [
        'option_c', 'option c', 'optionc', 'choice_c', 'choice c', 'choicec', 'c', 'opt_c', 'optc', '3rd option', 'third option'
      ]),
      option_d: findColumnIndex(headers, [
        'option_d', 'option d', 'optiond', 'choice_d', 'choice d', 'choiced', 'd', 'opt_d', 'optd', '4th option', 'fourth option'
      ]),
      correct_answer: findColumnIndex(headers, [
        'correct_answer', 'correct answer', 'answer', 'correct', 'ans', 'key', 'solution', 'right answer', 'correctanswer'
      ]),
      subject: findColumnIndex(headers, [
        'subject', 'topic', 'category', 'domain', 'area'
      ]),
      course: findColumnIndex(headers, [
        'course', 'program', 'curriculum', 'class', 'grade'
      ]),
      difficulty: findColumnIndex(headers, [
        'difficulty', 'level', 'complexity', 'grade'
      ]),
      marks: findColumnIndex(headers, [
        'marks', 'points', 'score', 'weight', 'value'
      ]),
      explanation: findColumnIndex(headers, [
        'explanation', 'solution', 'reason', 'justification', 'rationale', 'why'
      ])
    };
    
    console.log('📊 Column mapping:', columnMap);
    
    // Validate required columns with better error message
    const requiredColumns = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'];
    const missingColumns = requiredColumns.filter(col => columnMap[col] === -1);
    
    if (missingColumns.length > 0) {
      console.error('❌ Missing columns:', missingColumns);
      console.log('📋 Available headers in your CSV:', rawHeaders);
      
      let errorMessage = `Missing required columns: ${missingColumns.join(', ')}.\n\n`;
      errorMessage += `Your CSV headers: ${rawHeaders.join(', ')}\n\n`;
      errorMessage += 'Required headers should include:\n';
      errorMessage += '- Question (variations: question, question_text, problem)\n';
      errorMessage += '- Option A (variations: option_a, option a, choice_a)\n';
      errorMessage += '- Option B (variations: option_b, option b, choice_b)\n';
      errorMessage += '- Option C (variations: option_c, option c, choice_c)\n';
      errorMessage += '- Option D (variations: option_d, option d, choice_d)\n';
      errorMessage += '- Correct Answer (variations: correct_answer, answer, correct)\n\n';
      errorMessage += 'Please download the sample CSV to see the correct format.';
      
      throw new Error(errorMessage);
    }
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const values = parseCsvLine(line);
        
        if (values.length < Math.max(...Object.values(columnMap)) + 1) {
          console.warn(`⚠️ Row ${i + 1} has insufficient columns, skipping`);
          continue;
        }
        
        const questionText = values[columnMap.question]?.trim();
        const optionA = values[columnMap.option_a]?.trim();
        const optionB = values[columnMap.option_b]?.trim();
        const optionC = values[columnMap.option_c]?.trim();
        const optionD = values[columnMap.option_d]?.trim();
        const correctAnswer = values[columnMap.correct_answer]?.trim().toUpperCase();
        
        // Validate required fields
        if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
          console.warn(`⚠️ Row ${i + 1} missing required data, skipping`);
          continue;
        }
        
        // Validate correct answer format
        if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
          console.warn(`⚠️ Row ${i + 1} invalid correct answer "${correctAnswer}", skipping`);
          continue;
        }
        
        const questionData = {
          question_text: questionText,
          option_a: optionA,
          option_b: optionB,
          option_c: optionC,
          option_d: optionD,
          correct_answer: correctAnswer,
          subject: columnMap.subject >= 0 ? (values[columnMap.subject]?.trim() || 'General') : 'General',
          course: columnMap.course >= 0 ? (values[columnMap.course]?.trim() || 'General Course') : 'General Course',
          difficulty: columnMap.difficulty >= 0 ? (values[columnMap.difficulty]?.trim() || 'Easy') : 'Easy',
          marks: columnMap.marks >= 0 ? (parseInt(values[columnMap.marks]) || 1) : 1,
          explanation: columnMap.explanation >= 0 ? (values[columnMap.explanation]?.trim() || '') : ''
        };
        
        // Validate difficulty
        if (!['Easy', 'Medium', 'Hard'].includes(questionData.difficulty)) {
          questionData.difficulty = 'Easy';
        }
        
        // Validate marks range
        if (questionData.marks < 1 || questionData.marks > 10) {
          questionData.marks = 1;
        }
        
        questions.push(questionData);
        
      } catch (error) {
        console.warn(`⚠️ Error parsing row ${i + 1}:`, error.message);
        continue;
      }
    }
    
    console.log(`✅ Successfully parsed ${questions.length} valid questions from ${lines.length - 1} data rows`);
    return questions;
  };

  // Helper function to find column index by name variations with improved matching
  const findColumnIndex = (headers, variations) => {
    // First try exact match (headers are already lowercase)
    for (const variation of variations) {
      const normalizedVariation = variation.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const index = headers.findIndex(header => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedHeader === normalizedVariation;
      });
      
      if (index >= 0) {
        console.log(`✅ Found column "${headers[index]}" matching variation "${variation}"`);
        return index;
      }
    }
    
    // If no exact match, try partial matches
    for (const variation of variations) {
      const normalizedVariation = variation.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const index = headers.findIndex(header => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedHeader.includes(normalizedVariation) || normalizedVariation.includes(normalizedHeader);
      });
      
      if (index >= 0) {
        console.log(`🔍 Found partial match "${headers[index]}" for variation "${variation}"`);
        return index;
      }
    }
    
    console.warn(`❌ No match found for variations:`, variations);
    return -1;
  };

  // Helper function to parse CSV line handling commas in quotes
  const parseCsvLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim().replace(/^["']|["']$/g, ''));
    return values;
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) {
      alert('Please select questions to delete');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedQuestions.length} selected questions?`)) {
      try {
        setLoading(true);
        const response = await questionService.bulkDeleteQuestions(selectedQuestions);

        if (response.success) {
          setSelectedQuestions([]);
          await loadQuestions();
        } else {
          throw new Error('Bulk delete failed');
        }
      } catch (error) {
        alert(error.message || 'Failed to delete questions. Please try again.');
        setLoading(false);
      }
    }
  };

  // Handle select all questions
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedQuestions(questions.map(q => q.id));
    } else {
      setSelectedQuestions([]);
    }
  };

  // Handle individual question selection
  const handleQuestionSelect = (questionId, checked) => {
    if (checked) {
      setSelectedQuestions(prev => [...prev, questionId]);
    } else {
      setSelectedQuestions(prev => prev.filter(id => id !== questionId));
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Utility function for difficulty color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Utility function for form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setSubjectFilter('');
    setCourseFilter('');
    setDifficultyFilter('');
    setCurrentPage(1);
  };

  const options = ['A', 'B', 'C', 'D'];

  return (
    <BranchLayout>
      <div className="bg-gray-50 min-h-screen pb-20 sm:pb-0">
        <div className="max-w-8xl mx-auto">
          <div className="bg-white shadow-sm border-b border-gray-200">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2.5 rounded-lg flex-shrink-0 text-white shadow-md">
                    <FaQuestion className="text-xl" />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Question Management</h1>
                    {totalQuestions > 0 && (
                      <p className="text-sm text-gray-500 mt-1">Total: {totalQuestions} questions</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  {/* Action Buttons */}
                  {/* Mobile: Stack full width. Desktop: Flex row */}
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center space-x-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <FaFileImport />
                      <span>Import CSV</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0])}
                      className="hidden"
                    />

                    <button
                      onClick={handleCreate}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold shadow-md col-span-2 sm:col-span-1"
                    >
                      <FaPlus />
                      <span>Add New</span>
                    </button>
                  </div>

                  {csvFile && (
                    <div className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 mt-2 sm:mt-0">
                      <span className="text-xs text-blue-800 truncate max-w-[150px] mr-2" title={csvFile.name}>
                        {csvFile.name}
                      </span>
                      <div className="flex space-x-1">
                        <button onClick={handleCsvTest} className="text-xs bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded hover:bg-blue-50">Test</button>
                        <button onClick={handleCsvImport} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Import</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="px-4 sm:px-6 py-3 bg-white border-t border-gray-100">
              {/* Mobile Filter Toggle */}
              <div className="md:hidden mb-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 text-sm text-gray-600 font-medium border rounded-lg px-3 py-2 w-full justify-center bg-gray-50"
                >
                  <FaFilter />
                  <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
                </button>
              </div>

              <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Search */}
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search questions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  {/* Subject Filter */}
                  <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">All Subjects</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>

                  {/* Course Filter */}
                  <select
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">All Courses</option>
                    {courses.map(course => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>

                  {/* Difficulty Filter */}
                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">All Difficulties</option>
                    {difficulties.map(difficulty => (
                      <option key={difficulty} value={difficulty}>{difficulty}</option>
                    ))}
                  </select>
                </div>

                {/* Active Filter Badges */}
                {(searchTerm || subjectFilter || courseFilter || difficultyFilter) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {searchTerm && <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100 text-xs">Search: {searchTerm}</span>}
                    {subjectFilter && <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded border border-orange-100 text-xs text-orange-800">Subject: {subjectFilter}</span>}
                    {courseFilter && <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-100 text-xs">Course: {courseFilter}</span>}
                    {difficultyFilter && <span className="px-2 py-1 bg-green-50 text-green-700 rounded border border-green-100 text-xs">Diff: {difficultyFilter}</span>}
                    <button onClick={resetFilters} className="text-xs text-gray-500 hover:text-gray-800 underline ml-auto">Clear All</button>
                  </div>
                )}
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedQuestions.length > 0 && (
              <div className="px-4 sm:px-6 py-2 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-blue-800">
                  {selectedQuestions.length} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedQuestions([])}
                    className="px-3 py-1 bg-white border border-gray-300 text-gray-600 rounded text-xs font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 flex items-center"
                  >
                    <FaTrash className="mr-1.5" /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6">
            {/* Loading State */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-100 border-t-blue-600 mb-3"></div>
                <span className="text-gray-500 font-medium">Loading details...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
                <div className="flex items-center">
                  <p className="text-red-800 font-medium">{error}</p>
                  <button onClick={loadQuestions} className="ml-4 text-red-600 hover:text-red-800 underline text-sm font-bold">Retry</button>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left w-10">
                            <input
                              type="checkbox"
                              checked={questions.length > 0 && selectedQuestions.length === questions.length}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Question</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subject / Course</th>
                          <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Diff / Marks</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {questions.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-6 py-16 text-center text-gray-500">
                              <div className="flex flex-col items-center">
                                <div className="bg-gray-100 p-4 rounded-full mb-3">
                                  <FaQuestion className="text-2xl text-gray-400" />
                                </div>
                                <p className="text-lg font-medium text-gray-900 mb-1">No questions found</p>
                                <p className="text-sm">Try adjusting your filters or create a new question.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          questions.map((question) => (
                            <tr key={question.id} className="hover:bg-blue-50/30 transition-colors group">
                              <td className="px-6 py-4 align-top pt-5">
                                <input
                                  type="checkbox"
                                  checked={selectedQuestions.includes(question.id)}
                                  onChange={(e) => handleQuestionSelect(question.id, e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                />
                              </td>
                              <td className="px-6 py-4">
                                <div className="max-w-lg">
                                  <p className="font-medium text-gray-900 text-base line-clamp-2 mb-1">{question.questionText}</p>
                                  {question.explanation && (
                                    <p className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded inline-block max-w-full truncate">
                                      <span className="font-semibold mr-1">Exp:</span>{question.explanation}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 align-top pt-5">
                                <div className="flex flex-col space-y-1">
                                  <span className="text-sm font-medium text-gray-800">{question.subject}</span>
                                  <span className="text-xs text-gray-500">{question.course}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center align-top pt-5">
                                <div className="flex flex-col items-center space-y-1">
                                  <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border ${question.difficulty === 'Easy' ? 'bg-green-50 text-green-700 border-green-100' :
                                      question.difficulty === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                        'bg-red-50 text-red-700 border-red-100'
                                    }`}>
                                    {question.difficulty}
                                  </span>
                                  <span className="text-xs font-bold text-gray-500 border border-gray-200 px-2 py-0.5 rounded bg-gray-50">
                                    {question.marks} Pts
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right align-top pt-5">
                                <div className="flex items-center justify-end space-x-2 opacity-100">
                                  <button onClick={() => handlePreview(question)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Preview"><FaEye /></button>
                                  <button onClick={() => handleEdit(question)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit"><FaEdit /></button>
                                  <button onClick={() => handleDelete(question.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete"><FaTrash /></button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {questions.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
                      <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <FaQuestion className="text-gray-400" />
                      </div>
                      <h3 className="text-gray-900 font-medium">No questions found</h3>
                      <p className="text-gray-500 text-sm mt-1">Try changing filters</p>
                    </div>
                  )}

                  {questions.map((question) => (
                    <div key={question.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${selectedQuestions.includes(question.id) ? 'border-blue-300 ring-2 ring-blue-50' : 'border-gray-200'}`}>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start space-x-3">
                            <div className="pt-1">
                              <input
                                type="checkbox"
                                checked={selectedQuestions.includes(question.id)}
                                onChange={(e) => handleQuestionSelect(question.id, e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5"
                              />
                            </div>
                            <div className="flex-1">
                              <span className={`inline-block px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-sm mb-1.5 border ${question.difficulty === 'Easy' ? 'bg-green-50 text-green-700 border-green-100' :
                                  question.difficulty === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                    'bg-red-50 text-red-700 border-red-100'
                                }`}>
                                {question.difficulty} • {question.marks} Pts
                              </span>
                              <p className="text-gray-900 font-semibold text-sm leading-snug line-clamp-3">
                                {question.questionText}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-2 rounded-lg mb-3">
                          <div>
                            <span className="block font-semibold text-gray-700 text-[10px] uppercase">Subject</span>
                            <span className="truncate max-w-[100px] block">{question.subject}</span>
                          </div>
                          <div className="text-right">
                            <span className="block font-semibold text-gray-700 text-[10px] uppercase">Course</span>
                            <span className="truncate max-w-[100px] block">{question.course}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <button onClick={() => handlePreview(question)} className="flex-1 py-1.5 text-blue-600 font-medium text-xs hover:bg-blue-50 rounded">Preview</button>
                          <div className="w-px h-4 bg-gray-200 mx-1"></div>
                          <button onClick={() => handleEdit(question)} className="flex-1 py-1.5 text-indigo-600 font-medium text-xs hover:bg-indigo-50 rounded">Edit</button>
                          <div className="w-px h-4 bg-gray-200 mx-1"></div>
                          <button onClick={() => handleDelete(question.id)} className="flex-1 py-1.5 text-red-600 font-medium text-xs hover:bg-red-50 rounded">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-600 font-medium order-2 sm:order-1 text-center sm:text-left">
                      Showing <span className="text-gray-900 font-bold">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(currentPage * itemsPerPage, totalQuestions)}</span> of {totalQuestions}
                    </div>
                    <div className="flex justify-center space-x-2 order-1 sm:order-2 w-full sm:w-auto">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none justify-center"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none justify-center"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modal styling responsive update */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white rounded-none sm:rounded-2xl shadow-xl w-full max-w-4xl h-full sm:max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  {selectedQuestion ? 'Edit Question' : 'Add New Question'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                  <FaTimes className="text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
                <form id="question-form" onSubmit={handleSubmit} className="space-y-6">
                  <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Question Text <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="question_text"
                      value={formData.question_text}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                      rows={3}
                      placeholder="Type your question here..."
                      required
                    />
                  </div>

                  <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider text-xs border-b pb-2">Answer Options</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {options.map((option) => (
                        <div key={option}>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">
                            Option {option} <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">{option}</span>
                            <input
                              type="text"
                              name={`option_${option.toLowerCase()}`}
                              value={formData[`option_${option.toLowerCase()}`]}
                              onChange={handleInputChange}
                              className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder={`Enter Answer ${option}`}
                              required
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Correct Answer <span className="text-red-500">*</span>
                        </label>
                        <div className="flex space-x-2">
                          {options.map((opt) => (
                            <label key={opt} className={`flex-1 flex items-center justify-center py-2.5 border rounded-lg cursor-pointer transition-all ${formData.correct_answer === opt ? 'bg-green-500 text-white border-green-600 font-bold shadow-sm' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                              }`}>
                              <input
                                type="radio"
                                name="correct_answer"
                                value={opt}
                                checked={formData.correct_answer === opt}
                                onChange={handleInputChange}
                                className="hidden"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                        <select
                          name="subject"
                          value={formData.subject}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          required
                        >
                          <option value="">Select Subject</option>
                          {subjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
                          <option value="custom">+ Add New</option>
                        </select>
                        {formData.subject === 'custom' && (
                          <input
                            type="text"
                            placeholder="New Subject Name"
                            className="mt-2 w-full px-3 py-2 border rounded-lg text-sm"
                            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                          />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Course</label>
                        <select
                          name="course"
                          value={formData.course}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          required
                        >
                          <option value="">Select Course</option>
                          {courses.map(course => <option key={course} value={course}>{course}</option>)}
                          <option value="custom">+ Add New</option>
                        </select>
                        {formData.course === 'custom' && (
                          <input
                            type="text"
                            placeholder="New Course Name"
                            className="mt-2 w-full px-3 py-2 border rounded-lg text-sm"
                            onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Difficulty</label>
                        <select
                          name="difficulty"
                          value={formData.difficulty}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          required
                        >
                          {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Marks</label>
                        <input
                          type="number"
                          name="marks"
                          value={formData.marks}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          min="1" max="10" required
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Explanation (Optional)</label>
                      <textarea
                        name="explanation"
                        value={formData.explanation}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        rows={2}
                        placeholder="Why is this the correct answer?"
                      />
                    </div>
                  </div>
                </form>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-white shrink-0 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm hidden sm:block"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="question-form"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow-md"
                >
                  {loading ? 'Saving...' : selectedQuestion ? 'Update Question' : 'Save Question'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showPreviewModal && selectedQuestion && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                <h3 className="text-lg font-bold text-gray-900">Preview</h3>
                <button onClick={() => setShowPreviewModal(false)}><FaTimes className="text-gray-400 hover:text-gray-600" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-4">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 ${selectedQuestion.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                      selectedQuestion.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {selectedQuestion.difficulty} • {selectedQuestion.marks} Marks
                  </span>
                  <h4 className="text-lg font-bold text-gray-900 leading-snug">{selectedQuestion.questionText}</h4>
                  <div className="mt-2 flex space-x-4 text-xs text-gray-500 font-medium">
                    <span>Subject: {selectedQuestion.subject}</span>
                    <span>Course: {selectedQuestion.course}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {options.map((opt) => (
                    <div key={opt} className={`p-4 rounded-xl border-2 transition-all ${selectedQuestion.correctAnswer === opt ? 'bg-green-50 border-green-500 shadow-sm' : 'bg-white border-transparent shadow-sm'
                      }`}>
                      <div className="flex items-start">
                        <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold mr-3 ${selectedQuestion.correctAnswer === opt ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>
                          {opt}
                        </span>
                        <span className={`text-sm font-medium ${selectedQuestion.correctAnswer === opt ? 'text-green-900' : 'text-gray-700'}`}>
                          {selectedQuestion[`option${opt}`]}
                        </span>
                        {selectedQuestion.correctAnswer === opt && (
                          <FaCheckCircle className="ml-auto text-green-500 text-lg" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedQuestion.explanation && (
                  <div className="mt-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h5 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Explanation</h5>
                    <p className="text-sm text-blue-900">{selectedQuestion.explanation}</p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                <button onClick={() => setShowPreviewModal(false)} className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-bold text-sm">Close Preview</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BranchLayout>
  );
};

export default AdminQuestion;