import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getCourseById } from '../api/coursesApi';
import CreateCourse from '../pages/CreateCourse';

const EditCoursePage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCourseData = async () => {
      try {
        setLoading(true);
        
        // Try to get course data from location state first
        const stateData = location.state?.course;
        
        if (stateData && stateData.id === id) {
          setCourseData(stateData);
          setLoading(false);
        } else {
          // Fetch course data from API
          const response = await getCourseById(id);
          setCourseData(response.course || response);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading course data:', err);
        setError('Failed to load course data');
        setLoading(false);
      }
    };

    if (id) {
      loadCourseData();
    }
  }, [id, location.state]);

  const handleClose = () => {
    // Navigate back to courses list
    navigate('/superadmin/courses/all');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-yellow-50/50 to-orange-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-amber-700">Loading course data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-yellow-50/50 to-orange-50/50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button 
            onClick={handleClose}
            className="mt-4 px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-yellow-50/50 to-orange-50/50">
      <CreateCourse 
        isOpen={true} 
        onClose={handleClose}
        editMode={true}
        courseData={courseData}
      />
    </div>
  );
};

export default EditCoursePage;