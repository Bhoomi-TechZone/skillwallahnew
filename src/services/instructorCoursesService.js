import { safeApiRequest, getApiBaseUrl } from '../config/api.js';

class InstructorCoursesService {
    constructor() {
        this.baseUrl = getApiBaseUrl();
    }

    async getCourses(instructorId) {
        const result = await safeApiRequest(`/api/instructor/courses?instructor_id=${instructorId}`);
        if (!result.success) {
            console.log('Using mock courses data due to API error:', result.error);
            return this.getMockCourses();
        }
        return result.data;
    }

    async createCourse(courseData) {
        const result = await safeApiRequest('/api/instructor/courses', {
            method: 'POST',
            body: JSON.stringify(courseData)
        });
        if (!result.success) {
            console.log('Course creation failed, using mock response:', result.error);
            return this.getMockCourseCreation(courseData);
        }
        return result.data;
    }

    async updateCourse(courseId, courseData) {
        const result = await safeApiRequest(`/api/instructor/courses/${courseId}`, {
            method: 'PUT',
            body: JSON.stringify(courseData)
        });
        if (!result.success) {
            console.log('Course update failed, using mock response:', result.error);
            return this.getMockCourseUpdate(courseId, courseData);
        }
        return result.data;
    }

    async deleteCourse(courseId) {
        const result = await safeApiRequest(`/api/instructor/courses/${courseId}`, {
            method: 'DELETE'
        });
        if (!result.success) {
            console.log('Course deletion failed:', result.error);
            return false;
        }
        return true;
    }

    // Mock data methods
    getMockCourses() {
        return [
            {
                id: 1,
                title: "React Development Fundamentals",
                description: "Learn the basics of React development from scratch",
                category: "Web Development",
                price: 99.99,
                originalPrice: 149.99,
                duration: "8 weeks",
                level: "Beginner",
                language: "English",
                students: 245,
                rating: 4.8,
                reviews: 48,
                status: "published",
                thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300",
                createdAt: "2024-01-15",
                updatedAt: "2024-08-20",
                tags: ["React", "JavaScript", "Frontend"],
                modules: 12,
                lectures: 48,
                totalDuration: "6h 30m"
            },
            {
                id: 2,
                title: "Advanced JavaScript Concepts",
                description: "Deep dive into advanced JavaScript patterns and concepts",
                category: "Web Development",
                price: 129.99,
                originalPrice: 199.99,
                duration: "6 weeks",
                level: "Advanced",
                language: "English",
                students: 189,
                rating: 4.9,
                reviews: 32,
                status: "published",
                thumbnail: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=300",
                createdAt: "2024-02-10",
                updatedAt: "2024-08-18",
                tags: ["JavaScript", "ES6", "Advanced"],
                modules: 10,
                lectures: 35,
                totalDuration: "5h 45m"
            },
            {
                id: 3,
                title: "Node.js Backend Development",
                description: "Build scalable backend applications with Node.js",
                category: "Backend Development",
                price: 149.99,
                originalPrice: 249.99,
                duration: "10 weeks",
                level: "Intermediate",
                language: "English",
                students: 167,
                rating: 4.7,
                reviews: 28,
                status: "draft",
                thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300",
                createdAt: "2024-03-05",
                updatedAt: "2024-08-15",
                tags: ["Node.js", "Express", "MongoDB"],
                modules: 15,
                lectures: 60,
                totalDuration: "8h 20m"
            }
        ];
    }

    getMockCourseCreation(courseData) {
        return {
            id: Date.now(),
            ...courseData,
            students: 0,
            rating: 0,
            reviews: 0,
            status: "draft",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            modules: 0,
            lectures: 0,
            totalDuration: "0h 0m"
        };
    }

    getMockCourseUpdate(courseId, courseData) {
        return {
            id: courseId,
            ...courseData,
            updatedAt: new Date().toISOString()
        };
    }

    getCategories() {
        return [
            "Web Development",
            "Backend Development",
            "Mobile Development",
            "Data Science",
            "Machine Learning",
            "UI/UX Design",
            "DevOps",
            "Cybersecurity",
            "Digital Marketing",
            "Business"
        ];
    }

    getLanguages() {
        return [
            "English",
            "Spanish", 
            "French",
            "German",
            "Italian",
            "Portuguese",
            "Chinese",
            "Japanese",
            "Korean",
            "Arabic"
        ];
    }

    getLevels() {
        return ["Beginner", "Intermediate", "Advanced"];
    }
}

export default new InstructorCoursesService();
