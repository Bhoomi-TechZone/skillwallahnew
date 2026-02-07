import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getInstructorName, getCourseThumbnail, formatEnrollmentDate, getCourseId, getProgressPercentage } from '../utils/courseUtils';

const MyCourses = () => {
    console.log('🎯 MyCourses component is rendering...');
    
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    console.log('📊 Current state:', { 
        coursesLength: courses.length, 
        loading, 
        error 
    });

    useEffect(() => {
        console.log('🔄 MyCourses component loaded - checking localStorage for enrolled courses');
        // Instead of fetching from API, get enrolled courses from localStorage
        const enrolledCoursesFromStorage = localStorage.getItem('enrolledCourses');
        if (enrolledCoursesFromStorage) {
            try {
                const parsedCourses = JSON.parse(enrolledCoursesFromStorage);
                console.log('📚 Found enrolled courses in localStorage:', parsedCourses);
                setCourses(parsedCourses);
            } catch (error) {
                console.error('Error parsing enrolled courses from localStorage:', error);
                setCourses([]);
            }
        } else {
            console.log('📭 No enrolled courses found in localStorage');
            setCourses([]);
        }
        setLoading(false);
    }, []);

    // Listen for storage changes to update courses when new enrollments happen
    useEffect(() => {
        const handleStorageChange = () => {
            console.log('🔄 Storage changed - updating enrolled courses');
            const enrolledCoursesFromStorage = localStorage.getItem('enrolledCourses');
            if (enrolledCoursesFromStorage) {
                try {
                    const parsedCourses = JSON.parse(enrolledCoursesFromStorage);
                    setCourses(parsedCourses);
                } catch (error) {
                    console.error('Error parsing enrolled courses from localStorage:', error);
                    setCourses([]);
                }
            } else {
                setCourses([]);
            }
        };

        // Listen for custom enrollment event
        window.addEventListener('courseEnrolled', handleStorageChange);
        
        return () => {
            window.removeEventListener('courseEnrolled', handleStorageChange);
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-4 text-orange-800 font-semibold">Loading your courses...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
                <div className="text-center">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                        <p className="font-semibold">Error:</p>
                        <p>{error}</p>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-100 py-8 px-2 sm:px-6 lg:px-12 flex items-center justify-center">
            <div className="w-full max-w-6xl">
                <h2 className="text-3xl sm:text-4xl font-bold text-center text-orange-800 mb-10 drop-shadow-lg">🎓 My Courses</h2>
                
                {courses.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
                            <h3 className="text-xl font-semibold text-gray-700 mb-4">No courses enrolled yet</h3>
                            <p className="text-gray-500 mb-6">Start your learning journey by enrolling in courses that interest you.</p>
                            <Link 
                                to="/courses" 
                                className="inline-block bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow transition-colors duration-200"
                            >
                                Browse Courses
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 justify-center">
                        {courses.map(course => (
                            <div
                                key={getCourseId(course)}
                                className="bg-white border border-orange-100 p-0 rounded-2xl shadow-lg flex flex-col hover:shadow-2xl transition-shadow duration-300"
                            >
                                <img
                                    src={getCourseThumbnail(course, '/placeholder-course.jpg')}
                                    alt={course.title}
                                    className="w-full h-32 object-cover object-center rounded-t-2xl"
                                />
                                <div className="flex-1 flex flex-col p-5">
                                    <h3 className="text-lg font-semibold text-orange-900 mb-1 truncate">{course.title}</h3>
                                    <p className="text-sm text-gray-600 mb-1">
                                        <span className="font-medium text-orange-700">Instructor:</span> {getInstructorName(course.instructor, course.instructor_name, 'N/A')}
                                    </p>
                                    <p className="text-xs text-gray-500 mb-3">
                                        <span className="font-medium text-orange-700">Enrolled:</span> {formatEnrollmentDate(course.enrolledDate)}
                                    </p>
                                    <div className="mb-4">
                                        <div className="w-full bg-orange-100 rounded-full h-3">
                                            <div
                                                className="bg-gradient-to-r from-orange-400 to-blue-600 h-3 rounded-full flex items-center justify-end pr-2 text-xs text-white font-bold transition-all duration-500"
                                                style={{ width: `${getProgressPercentage(course.progress)}%` }}
                                            >
                                                {getProgressPercentage(course.progress)}%
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Let's Start Learning Button - Primary CTA */}
                                    <Link
                                        to={`/course-content/${getCourseId(course)}`}
                                        className="mb-2 inline-block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-all duration-200 text-center transform hover:scale-105"
                                    >
                                        🚀 Let's Start Learning!
                                    </Link>
                                    
                                    <Link
                                        to={`/course-content/${getCourseId(course)}?continue=true`}
                                        className="mt-auto inline-block bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition-colors duration-200 text-center"
                                    >
                                        Continue Learning ({getProgressPercentage(course.progress)}%)
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyCourses;
