// Study Materials/Subjects API Service
import authService from '../services/authService';

const API_BASE_URL = 'http://localhost:4000/api';

class StudyMaterialsAPI {
    // Helper method to make authenticated API calls
    async apiCall(endpoint, options = {}) {
        try {
            const authData = authService.getAuthData();
            const token = authData.token;
            const defaultHeaders = {
                'Authorization': `Bearer ${token}`,
            };

            // Don't set Content-Type for FormData (let browser set it with boundary)
            if (!(options.body instanceof FormData)) {
                defaultHeaders['Content-Type'] = 'application/json';
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    ...defaultHeaders,
                    ...options.headers,
                },
                ...options,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API call failed for ${endpoint}:`, error);
            throw error;
        }
    }

    // Get actual uploaded study materials (from branch_study_materials collection)
    async getStudyMaterials(filters = {}) {
        const queryParams = new URLSearchParams();

        if (filters.program_id) queryParams.append('program_id', filters.program_id);
        if (filters.course_id) queryParams.append('course_id', filters.course_id);
        if (filters.subject_id) queryParams.append('subject_id', filters.subject_id);
        if (filters.material_type) queryParams.append('material_type', filters.material_type);
        if (filters.status) queryParams.append('status', filters.status);

        const endpoint = `/branch-study-materials/materials${queryParams.toString() ? `?${queryParams}` : ''}`;
        return this.apiCall(endpoint);
    }

    // Get all subjects for a branch with optional filtering
    async getSubjects(filters = {}) {
        const queryParams = new URLSearchParams();

        if (filters.program_id) queryParams.append('program_id', filters.program_id);
        if (filters.course_id) queryParams.append('course_id', filters.course_id);
        if (filters.semester) queryParams.append('semester', filters.semester);
        if (filters.subject_type) queryParams.append('subject_type', filters.subject_type);
        // Don't send status filter - let backend use default filter {"$ne": "deleted"}
        if (filters.status) queryParams.append('status', filters.status);

        const endpoint = `/branch-subjects/subjects${queryParams.toString() ? `?${queryParams}` : ''}`;
        return this.apiCall(endpoint);
    }

    // Get a specific subject by ID
    async getSubject(subjectId) {
        return this.apiCall(`/branch-subjects/subjects/${subjectId}`);
    }

    // Create new subject
    async createSubject(subjectData) {
        return this.apiCall('/branch-subjects/subjects', {
            method: 'POST',
            body: JSON.stringify(subjectData),
        });
    }

    // Update existing subject
    async updateSubject(subjectId, subjectData) {
        return this.apiCall(`/branch-subjects/subjects/${subjectId}`, {
            method: 'PUT',
            body: JSON.stringify(subjectData),
        });
    }

    // Delete subject
    async deleteSubject(subjectId) {
        return this.apiCall(`/branch-subjects/subjects/${subjectId}`, {
            method: 'DELETE',
        });
    }

    // Create new study material
    async createMaterial(materialData) {
        return this.apiCall('/branch-study-materials/materials', {
            method: 'POST',
            body: JSON.stringify(materialData),
        });
    }

    // Update existing study material
    async updateMaterial(materialId, materialData) {
        return this.apiCall(`/branch-study-materials/materials/${materialId}`, {
            method: 'PUT',
            body: JSON.stringify(materialData),
        });
    }

    // Delete study material
    async deleteMaterial(materialId) {
        return this.apiCall(`/branch-study-materials/materials/${materialId}`, {
            method: 'DELETE',
        });
    }

    // Get a specific study material by ID
    async getMaterial(materialId) {
        return this.apiCall(`/branch-study-materials/materials/${materialId}`);
    }

    // Download study material
    async downloadMaterial(materialId) {
        const authData = authService.getAuthData();
        const token = authData.token;

        return fetch(`${API_BASE_URL}/branch-study-materials/materials/${materialId}/download`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
    }

    // Get file URL for serving
    async getFileUrl(materialId) {
        try {
            const response = await this.downloadMaterial(materialId);
            const data = await response.json();
            return data.file_url || null;
        } catch (error) {
            console.error('Error getting file URL:', error);
            return null;
        }
    }

    // Get programs list (fallback method - you might have a separate programs API)
    async getPrograms() {
        try {
            return this.apiCall('/branch-programs/programs');
        } catch (error) {
            // Return fallback data if API doesn't exist
            return {
                success: true,
                data: [
                    'VOCATIONAL COURSES',
                    'UNIVERSITY COURSES',
                    'Certificate Courses',
                    'PG Courses',
                    'Diploma Courses'
                ]
            };
        }
    }

    // Get courses for a program (fallback method - you might have a separate courses API)
    async getCourses(programId) {
        try {
            return this.apiCall(`/branch-courses/courses?program_id=${programId}`);
        } catch (error) {
            // Return fallback data if API doesn't exist
            const fallbackCourses = {
                'VOCATIONAL COURSES': [
                    'DIPLOMA IN ELECTRICAL & ELECTRONICS TECHNOLOGY',
                    'DIPLOMA IN MECHANICAL ENGINEERING'
                ],
                'UNIVERSITY COURSES': [
                    'BCA (Bachelor of Computer Applications)',
                    'MCA (Master of Computer Applications)'
                ],
                'Certificate Courses': [
                    'ADVANCE DIPLOMA IN COMPUTER APPLICATION (ADCA)',
                    'Diploma in Computer Application (DCA)'
                ],
                'PG Courses': [
                    'MBA (Master of Business Administration)',
                    'PGDM (Post Graduate Diploma in Management)'
                ],
                'Diploma Courses': [
                    'Diploma in Web Development',
                    'Diploma in Digital Marketing'
                ]
            };

            return {
                success: true,
                data: fallbackCourses[programId] || []
            };
        }
    }

    // Get all unique subject types from existing subjects
    async getSubjectTypes() {
        try {
            const subjects = await this.getSubjects();
            const types = [...new Set(subjects.map(s => s.subject_type))];
            return {
                success: true,
                data: types.length > 0 ? types : ['theory', 'practical', 'project']
            };
        } catch (error) {
            return {
                success: true,
                data: ['theory', 'practical', 'project']
            };
        }
    }

    // Get all study materials for a branch with optional filtering
    async getMaterials(filters = {}) {
        const queryParams = new URLSearchParams();

        if (filters.program_id) queryParams.append('program_id', filters.program_id);
        if (filters.course_id) queryParams.append('course_id', filters.course_id);
        if (filters.subject_id) queryParams.append('subject_id', filters.subject_id);
        if (filters.batch_id) queryParams.append('batch_id', filters.batch_id);
        if (filters.material_type) queryParams.append('material_type', filters.material_type);
        if (filters.access_level) queryParams.append('access_level', filters.access_level);
        if (filters.status) queryParams.append('status', filters.status);

        const endpoint = `/branch-study-materials/materials${queryParams.toString() ? `?${queryParams}` : ''}`;
        return this.apiCall(endpoint);
    }

    // For backward compatibility - map subjects as "materials" (deprecated)
    async getMaterialsFromSubjects(filters = {}) {
        return this.getSubjects(filters);
    }

    // Upload actual file to backend study materials
    async createMaterialFromFormData(formData) {
        try {
            const authData = authService.getAuthData();
            const token = authData.token;

            // Check if there's a file in formData
            const file = formData.get('file');

            if (file && file instanceof File) {
                // Upload file to backend
                console.log('Uploading file to backend...', file.name);

                const response = await fetch(`${API_BASE_URL}/branch-study-materials/materials/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        // Don't set Content-Type for FormData
                    },
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || `Upload failed: ${response.status}`);
                }

                const data = await response.json();
                console.log('File uploaded successfully:', data);
                return data;
            } else {
                // No file, create subject with metadata only
                const subjectData = {
                    subject_name: formData.get('fileName') || formData.get('subject_name'),
                    subject_code: formData.get('subject_code') || `SUB${Date.now()}`,
                    program_id: formData.get('program'),
                    course_id: formData.get('course'),
                    subject_type: formData.get('uploadType') === 'practical' ? 'practical' : 'theory',
                    description: formData.get('description') || '',
                    status: 'active'
                };

                return this.createSubject(subjectData);
            }
        } catch (error) {
            console.error('Error in createMaterialFromFormData:', error);
            throw error;
        }
    }

    // Update material with file upload support
    async updateMaterialFromFormData(materialId, formData) {
        try {
            const authData = authService.getAuthData();
            const token = authData.token;

            const file = formData.get('file');

            if (file && file instanceof File) {
                // Update with new file
                formData.append('material_id', materialId);

                const response = await fetch(`${API_BASE_URL}/branch-study-materials/materials/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || `Update failed: ${response.status}`);
                }

                return await response.json();
            } else {
                // Update metadata only
                const subjectData = {
                    subject_name: formData.get('fileName') || formData.get('subject_name'),
                    subject_type: formData.get('uploadType') === 'practical' ? 'practical' : 'theory',
                    description: formData.get('description') || '',
                };

                return this.updateSubject(materialId, subjectData);
            }
        } catch (error) {
            console.error('Error in updateMaterialFromFormData:', error);
            throw error;
        }
    }

    // End of class
}

export const studyMaterialsAPI = new StudyMaterialsAPI();