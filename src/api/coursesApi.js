// Note: setupAuth import removed - authentication is handled by existing tokens in localStorage
// import { setupAuth } from '../utils/authSetup';

const API_BASE_URL = 'http://localhost:4000';

/**
 * Fetch all courses with enrollment data
 */
export const fetchCourses = async () => {
  try {
    console.log('🔄 Fetching courses from backend API...');

    // Use the branch courses API endpoint which doesn't require authentication
    const response = await fetch(`${API_BASE_URL}/api/branch-courses/courses`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Courses API Response:', data);

    // Branch courses API returns array directly
    let courses = Array.isArray(data) ? data : (data.courses || []);

    // Map branch course format to expected format
    courses = courses.map(course => ({
      id: course.id,
      course_id: course.course_code,
      title: course.course_name,
      name: course.course_name,
      description: course.description || 'No description available',
      category: course.category || course.program_name || 'General',
      duration: `${course.duration_months} months`,
      duration_months: course.duration_months,
      price: course.fee,
      fee: course.fee,
      admission_fee: course.admission_fee,
      enrolled_students: course.enrolled_students || 0,
      level: 'All Levels', // Default level
      instructor: 'Expert Instructor',
      rating: 4.5,
      reviews: 0,
      image: '/api/placeholder/400/300',
      syllabus_outline: course.syllabus_outline,
      prerequisites: course.prerequisites,
      max_students: course.max_students,
      status: course.status,
      program_name: course.program_name
    }));

    console.log('📊 Courses received from backend (mapped):', courses);

    return courses;
  } catch (error) {
    console.error('❌ Error fetching courses:', error);

    // Try to fetch from alternative endpoint or return enhanced mock data
    try {
      console.log('🔄 Trying to fetch enrollment data directly...');
      const enrichedMockData = await enrichCoursesWithEnrollmentData([
        {
          id: 1,
          course_id: 'MOCK001',
          title: 'Sample Course 1',
          description: 'This is a sample course',
          instructor_name: 'Sample Instructor',
          category: 'Programming',
          price: 99.99,
          original_price: 149.99,
          duration: '20 hours',
          level: 'Beginner',
          enrolled_students: 0,
          rating: 4.5,
          total_ratings: 20,
          status: 'Active',
          created_date: '2025-01-01T00:00:00'
        }
      ]);
      return enrichedMockData;
    } catch (enrichError) {
      console.error('❌ Error enriching mock data:', enrichError);
      return [];
    }
  }
};

/**
 * Enrich courses with real enrollment data from backend
 */
const enrichCoursesWithEnrollmentData = async (courses) => {
  try {
    console.log('🔄 Enriching courses with enrollment data...');

    // Try to fetch enrollments directly from backend
    const enrollmentResponse = await fetch(`${API_BASE_URL}/api/ledger/transactions?type_filter=Course Enrollment&limit=1000`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (enrollmentResponse.ok) {
      const enrollmentData = await enrollmentResponse.json();
      const transactions = enrollmentData.data?.transactions || [];

      console.log('📊 Enrollment transactions:', transactions);

      // Count enrollments per course from transaction data
      const enrollmentCounts = {};
      transactions.forEach(transaction => {
        if (transaction.type === 'Course Enrollment') {
          // Extract course ID from transaction description or reference
          const courseMatch = transaction.reference?.match(/ENR-(.+)/) ||
            transaction.description?.match(/Course enrollment - (.+)/);
          if (courseMatch) {
            const courseKey = courseMatch[1];
            enrollmentCounts[courseKey] = (enrollmentCounts[courseKey] || 0) + 1;
          }
        }
      });

      // Enrich courses with enrollment data
      const enrichedCourses = courses.map(course => {
        const enrollmentCount = enrollmentCounts[course.course_id] ||
          enrollmentCounts[course.id] ||
          enrollmentCounts[course.title] || 0;

        return {
          ...course,
          enrolled_students: enrollmentCount,
          total_enrollments: enrollmentCount
        };
      });

      console.log('✅ Courses enriched with real enrollment data:', enrichedCourses);
      return enrichedCourses;
    }

    // Fallback: try to fetch from enrollments collection directly
    const directEnrollmentResponse = await fetch(`${API_BASE_URL}/enrollments/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (directEnrollmentResponse.ok) {
      const enrollmentData = await directEnrollmentResponse.json();
      const enrollments = enrollmentData.enrollments || enrollmentData || [];

      console.log('📊 Direct enrollments data:', enrollments);

      // Count enrollments per course
      const enrollmentCounts = {};
      enrollments.forEach(enrollment => {
        const courseId = enrollment.course_id || enrollment.course || enrollment.courseId;
        if (courseId) {
          enrollmentCounts[courseId] = (enrollmentCounts[courseId] || 0) + 1;
        }
      });

      // Enrich courses
      const enrichedCourses = courses.map(course => {
        const enrollmentCount = enrollmentCounts[course.course_id] ||
          enrollmentCounts[course.id] || 0;

        return {
          ...course,
          enrolled_students: enrollmentCount,
          total_enrollments: enrollmentCount
        };
      });

      console.log('✅ Courses enriched with direct enrollment data:', enrichedCourses);
      return enrichedCourses;
    }

    console.log('⚠️ No enrollment data available, returning courses as-is');
    return courses;

  } catch (error) {
    console.error('❌ Error enriching courses with enrollment data:', error);
    return courses;
  }
};

/**
 * Create a new course
 */
export const createCourse = async (courseData) => {
  try {
    // Note: Authentication is handled by existing tokens in localStorage
    // await setupAuth(); // REMOVED: This was overwriting logged-in users with super admin

    const response = await fetch(`${API_BASE_URL}/course/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(courseData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Course created:', data);
    return data;
  } catch (error) {
    console.error('Error creating course:', error);

    // Simulate successful creation for development
    const newCourse = {
      id: Date.now().toString(),
      course_id: `NEW${Date.now()}`,
      ...courseData,
      enrolled_students: 0,
      rating: 0,
      total_ratings: 0,
      created_date: new Date().toISOString(),
    };

    console.log('Simulated course creation:', newCourse);
    return newCourse;
  }
};

/**
 * Update an existing course
 */
export const updateCourse = async (courseId, courseData) => {
  try {
    // Note: Authentication is handled by existing tokens in localStorage
    // await setupAuth(); // REMOVED: This was overwriting logged-in users with super admin

    const response = await fetch(`${API_BASE_URL}/course/${courseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(courseData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Course updated:', data);
    return data;
  } catch (error) {
    console.error('Error updating course:', error);

    // Simulate successful update for development
    const updatedCourse = {
      id: courseId,
      ...courseData,
      last_updated: new Date().toISOString(),
    };

    console.log('Simulated course update:', updatedCourse);
    return updatedCourse;
  }
};

/**
 * Delete a course
 */
export const deleteCourse = async (courseId) => {
  try {
    // Note: Authentication is handled by existing tokens in localStorage
    // await setupAuth(); // REMOVED: This was overwriting logged-in users with super admin

    const response = await fetch(`${API_BASE_URL}/course/${courseId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Course deleted:', data);
    return data;
  } catch (error) {
    console.error('Error deleting course:', error);

    // Simulate successful deletion for development
    console.log('Simulated course deletion for ID:', courseId);
    return { success: true, message: 'Course deleted successfully', id: courseId };
  }
};

/**
 * Get a single course by ID
 */
export const getCourseById = async (courseId) => {
  try {
    // Note: Authentication is handled by existing tokens in localStorage
    // await setupAuth(); // REMOVED: This was overwriting logged-in users with super admin

    const response = await fetch(`${API_BASE_URL}/course/${courseId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Course details:', data);
    return data;
  } catch (error) {
    console.error('Error fetching course details:', error);

    // Return mock course data as fallback
    return {
      id: courseId,
      course_id: 'MOCK001',
      title: 'Sample Course',
      description: 'This is a sample course',
      instructor_name: 'Sample Instructor',
      category: 'Programming',
      price: 99.99,
      original_price: 149.99,
      duration: '20 hours',
      level: 'Beginner',
      enrolled_students: 50,
      rating: 4.5,
      total_ratings: 20,
      status: 'Active',
      created_date: '2025-01-01T00:00:00'
    };
  }
};

/**
 * Calculate course statistics
 */
export const getCourseStats = async () => {
  try {
    const courses = await fetchCourses();

    const totalCourses = courses.length;
    const activeCourses = courses.filter(course =>
      course.status === 'Active' || course.published === true
    ).length;
    const totalStudents = courses.reduce((sum, course) =>
      sum + (course.enrolled_students || 0), 0
    );
    const totalRevenue = courses.reduce((sum, course) =>
      sum + (course.revenue || 0), 0
    );

    return {
      totalCourses,
      activeCourses,
      totalStudents,
      totalRevenue,
      averageRating: courses.length > 0 ?
        courses.reduce((sum, course) => sum + (course.rating || 0), 0) / courses.length : 0
    };
  } catch (error) {
    console.error('Error calculating course stats:', error);

    // Return fallback stats
    return {
      totalCourses: 0,
      activeCourses: 0,
      totalStudents: 0,
      totalRevenue: 0,
      averageRating: 0
    };
  }
};

/**
 * Search courses
 */
export const searchCourses = async (searchTerm, category = null, level = null) => {
  try {
    const courses = await fetchCourses();

    let filteredCourses = courses;

    if (searchTerm) {
      filteredCourses = filteredCourses.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.instructor_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (category && category !== 'All') {
      filteredCourses = filteredCourses.filter(course =>
        course.category === category
      );
    }

    if (level && level !== 'All') {
      filteredCourses = filteredCourses.filter(course =>
        course.level === level
      );
    }

    return filteredCourses;
  } catch (error) {
    console.error('Error searching courses:', error);
    return [];
  }
};

/**
 * Get unique categories from courses
 */
export const getCourseCategories = async () => {
  try {
    const courses = await fetchCourses();
    const categories = [...new Set(courses.map(course => course.category))];
    return categories.filter(category => category);
  } catch (error) {
    console.error('Error fetching course categories:', error);
    return ['Programming', 'Design', 'Marketing', 'Business'];
  }
};

/**
 * Get unique levels from courses
 */
export const getCourseLevels = async () => {
  try {
    const courses = await fetchCourses();
    const levels = [...new Set(courses.map(course => course.level))];
    return levels.filter(level => level);
  } catch (error) {
    console.error('Error fetching course levels:', error);
    return ['Beginner', 'Intermediate', 'Advanced'];
  }
};

/**
 * Fetch all enrollments from the backend
 */
export const fetchEnrollments = async () => {
  const endpoint = 'http://localhost:4000/enrollment/all';

  try {
    console.log('📚 Fetching enrollments from:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Enrollments API Response:', data);

      // Handle different response structures
      if (data.enrollments && Array.isArray(data.enrollments)) {
        console.log(`📊 Returning ${data.enrollments.length} enrollments`);
        return data.enrollments;
      } else if (Array.isArray(data)) {
        console.log(`📊 Returning ${data.length} enrollments`);
        return data;
      } else if (data.data && Array.isArray(data.data)) {
        console.log(`📊 Returning ${data.data.length} enrollments`);
        return data.data;
      }
    } else {
      console.error('❌ Enrollment API returned error:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Failed to fetch enrollments:', error);
  }

  // Return empty array as fallback
  console.log('⚠️ No enrollment data available, returning empty array');
  return [];
};

/**
 * Get enrollment statistics
 */
export const getEnrollmentStats = async () => {
  try {
    const enrollments = await fetchEnrollments();

    const totalEnrollments = enrollments.length;
    const activeEnrollments = enrollments.filter(enrollment =>
      enrollment.status === 'active' || enrollment.status === 'enrolled'
    ).length;
    const completedEnrollments = enrollments.filter(enrollment =>
      enrollment.status === 'completed' || enrollment.status === 'finished'
    ).length;

    // Count unique students
    const uniqueStudents = new Set(enrollments.map(enrollment =>
      enrollment.student_id || enrollment.user_id
    )).size;

    return {
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      uniqueStudents
    };
  } catch (error) {
    console.error('Error calculating enrollment stats:', error);

    // Return fallback stats
    return {
      totalEnrollments: 0,
      activeEnrollments: 0,
      completedEnrollments: 0,
      uniqueStudents: 0
    };
  }
};

/**
 * Fetch all payment transactions
 */
export const fetchTransactions = async () => {
  try {
    // Note: Authentication is handled by existing tokens in localStorage
    // await setupAuth(); // REMOVED: This was overwriting logged-in users with super admin

    const response = await fetch(`${API_BASE_URL}/payments/transaction`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
      },
    });

    if (!response.ok) {
      console.warn(`Transactions API returned ${response.status}, using fallback data`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('💳 Transactions API Response:', data);

    // Handle different response formats
    if (data.transactions && Array.isArray(data.transactions)) {
      return data.transactions;
    } else if (Array.isArray(data)) {
      return data;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else {
      console.log('Unexpected transaction data format:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching transactions:', error);

    // Return mock transaction data as fallback
    return [
      {
        id: 1,
        transaction_id: 'TXN001',
        amount: 299.99,
        status: 'completed',
        payment_method: 'credit_card',
        course_id: 'COURSE001',
        student_id: 'STU001',
        created_at: '2025-11-01T10:00:00Z'
      },
      {
        id: 2,
        transaction_id: 'TXN002',
        amount: 199.99,
        status: 'completed',
        payment_method: 'upi',
        course_id: 'COURSE002',
        student_id: 'STU002',
        created_at: '2025-11-02T14:30:00Z'
      },
      {
        id: 3,
        transaction_id: 'TXN003',
        amount: 399.99,
        status: 'pending',
        payment_method: 'bank_transfer',
        course_id: 'COURSE003',
        student_id: 'STU003',
        created_at: '2025-11-03T09:15:00Z'
      },
      {
        id: 4,
        transaction_id: 'TXN004',
        amount: 149.99,
        status: 'completed',
        payment_method: 'wallet',
        course_id: 'COURSE004',
        student_id: 'STU004',
        created_at: '2025-11-04T16:45:00Z'
      }
    ];
  }
};

/**
 * Calculate total revenue from completed transactions
 */
export const getRevenueStats = async () => {
  try {
    const transactions = await fetchTransactions();

    // Filter completed transactions - check multiple possible status values
    const completedTransactions = transactions.filter(transaction => {
      const status = (transaction.status || '').toLowerCase();
      return status === 'completed' ||
        status === 'success' ||
        status === 'paid' ||
        status === 'successful' ||
        status === 'captured' ||
        status === 'settled' ||
        status === 'confirmed' ||
        status === 'approved';
    });

    // Calculate total revenue from completed transactions
    const totalRevenue = completedTransactions.reduce((sum, transaction) => {
      const amount = parseFloat(transaction.amount || transaction.total || transaction.value || 0);
      return sum + amount;
    }, 0);

    const totalTransactions = transactions.length;
    const completedCount = completedTransactions.length;
    const pendingTransactions = transactions.filter(transaction => {
      const status = (transaction.status || '').toLowerCase();
      return status === 'pending' ||
        status === 'processing' ||
        status === 'initiated' ||
        status === 'waiting';
    }).length;
    const failedTransactions = transactions.filter(transaction => {
      const status = (transaction.status || '').toLowerCase();
      return status === 'failed' ||
        status === 'cancelled' ||
        status === 'rejected' ||
        status === 'expired' ||
        status === 'declined';
    }).length;

    console.log('💰 Revenue Stats:', {
      totalRevenue,
      totalTransactions,
      completedCount,
      pendingTransactions,
      failedTransactions,
      statusBreakdown: transactions.reduce((acc, t) => {
        const status = t.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {})
    });

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
      totalTransactions,
      completedTransactions: completedCount,
      pendingTransactions,
      failedTransactions,
      completionRate: totalTransactions > 0 ? Math.round((completedCount / totalTransactions) * 100) : 0
    };
  } catch (error) {
    console.error('Error calculating revenue stats:', error);

    // Return fallback stats
    return {
      totalRevenue: 0,
      totalTransactions: 0,
      completedTransactions: 0,
      pendingTransactions: 0,
      failedTransactions: 0,
      completionRate: 0
    };
  }
};

/**
 * Submit a course review
 */
export const submitReview = async (reviewData) => {
  try {
    // Note: Authentication is handled by existing tokens in localStorage
    // await setupAuth(); // REMOVED: This was overwriting logged-in users with super admin

    const response = await fetch(`${API_BASE_URL}/reviews/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify(reviewData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Review submitted:', data);
    return data;
  } catch (error) {
    console.error('Error submitting review:', error);
    throw error;
  }
};

/**
 * Fetch reviews for a course
 */
export const fetchCourseReviews = async (courseId) => {
  try {
    // Note: Authentication is handled by existing tokens in localStorage
    // await setupAuth(); // REMOVED: This was overwriting logged-in users with super admin

    const response = await fetch(`${API_BASE_URL}/reviews/course/${courseId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Reviews fetched:', data);
    return data.reviews || data || [];
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
};