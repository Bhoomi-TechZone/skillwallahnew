/**
 * Utility functions for course data handling
 */

/**
 * Safely extract instructor name from various instructor data formats
 * @param {string|object} instructor - The instructor data (can be string, object with name, or object with instructor_name)
 * @param {string} instructorName - Alternative instructor_name field
 * @param {string} fallback - Fallback text if no instructor found
 * @returns {string} - The instructor name as a string
 */
export const getInstructorName = (instructor, instructorName = '', fallback = 'Instructor') => {
  // First try instructor_name field
  if (instructorName && typeof instructorName === 'string') {
    return instructorName;
  }
  
  // If instructor is a string, return it
  if (typeof instructor === 'string') {
    return instructor;
  }
  
  // If instructor is an object, try to get the name property
  if (instructor && typeof instructor === 'object') {
    if (instructor.name && typeof instructor.name === 'string') {
      return instructor.name;
    }
    if (instructor.instructor_name && typeof instructor.instructor_name === 'string') {
      return instructor.instructor_name;
    }
  }
  
  // Return fallback
  return fallback;
};

/**
 * Safely extract course thumbnail URL
 * @param {object} course - The course object
 * @param {string} fallback - Fallback image URL
 * @returns {string} - The thumbnail URL
 */
export const getCourseThumbnail = (course, fallback = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400') => {
  return course.thumbnail_url || course.thumbnail || fallback;
};

/**
 * Format enrollment date
 * @param {string} enrolledDate - The enrollment date string
 * @param {string} fallback - Fallback text if no date
 * @returns {string} - Formatted date string
 */
export const formatEnrollmentDate = (enrolledDate, fallback = 'Recently') => {
  if (!enrolledDate) return fallback;
  
  try {
    return new Date(enrolledDate).toLocaleDateString();
  } catch (error) {
    console.warn('Invalid enrollment date:', enrolledDate);
    return fallback;
  }
};

/**
 * Get course ID (handles both _id and id fields)
 * @param {object} course - The course object
 * @returns {string|null} - The course ID
 */
export const getCourseId = (course) => {
  return course._id || course.id || null;
};

/**
 * Calculate course progress percentage
 * @param {number} progress - Progress value (0-100)
 * @returns {number} - Clamped progress between 0 and 100
 */
export const getProgressPercentage = (progress) => {
  const numProgress = Number(progress) || 0;
  return Math.max(0, Math.min(100, numProgress));
};
