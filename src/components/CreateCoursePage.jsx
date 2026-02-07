import React from 'react';
import { useNavigate } from 'react-router-dom';
import CreateCourse from '../pages/CreateCourse';

const CreateCoursePage = () => {
  const navigate = useNavigate();
  
  const handleClose = () => {
    // Navigate back to courses list
    navigate('/superadmin/courses/all');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-yellow-50/50 to-orange-50/50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button 
            onClick={handleClose}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            ← Back to Courses
          </button>
        </div>
        <CreateCourse isOpen={true} onClose={handleClose} />
      </div>
    </div>
  );
};

export default CreateCoursePage;