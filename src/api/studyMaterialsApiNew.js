// Enhanced Study Materials API Service
import authService from '../services/authService';

const API_BASE_URL = 'http://localhost:4000/api';

class StudyMaterialsAPI {
    // Helper method to make authenticated API calls
    async apiCall(endpoint, options = {}) {
        try {
            const authData = authService.getAuthData();
            const token = authData?.token;

            if (!token) {
                throw new Error('Authentication token not found. Please login again.');
            }

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

            // Handle different response types
            if (response.status === 401) {
                throw new Error('Authentication failed. Please login again.');
            }

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            // For non-JSON responses (like file downloads), return the response object
            return response;
        } catch (error) {
            console.error(`API call failed for ${endpoint}:`, error);
            throw error;
        }
    }

    // Get all study materials with filtering
    async getMaterials(filters = {}) {
        const queryParams = new URLSearchParams();

        if (filters.material_type) queryParams.append('material_type', filters.material_type);
        if (filters.program_id) queryParams.append('program_id', filters.program_id);
        if (filters.course_id) queryParams.append('course_id', filters.course_id);
        if (filters.subject_id) queryParams.append('subject_id', filters.subject_id);
        if (filters.branch_code) queryParams.append('branch_code', filters.branch_code);
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.search) queryParams.append('search', filters.search);

        const endpoint = `/study-materials${queryParams.toString() ? `?${queryParams}` : ''}`;
        return this.apiCall(endpoint);
    }

    // Create new study material with file upload
    async createMaterial(materialData) {
        return this.apiCall('/study-materials', {
            method: 'POST',
            body: JSON.stringify(materialData),
        });
    }

    // Create study material with FormData (for file uploads)
    async createMaterialFromFormData(formData) {
        return this.apiCall('/study-materials/upload', {
            method: 'POST',
            body: formData, // FormData object
        });
    }

    // Update existing study material
    async updateMaterial(materialId, materialData) {
        return this.apiCall(`/study-materials/${materialId}`, {
            method: 'PUT',
            body: JSON.stringify(materialData),
        });
    }

    // Update study material with FormData (for file uploads)
    async updateMaterialFromFormData(materialId, formData) {
        return this.apiCall(`/study-materials/${materialId}/upload`, {
            method: 'PUT',
            body: formData, // FormData object
        });
    }

    // Delete study material
    async deleteMaterial(materialId) {
        return this.apiCall(`/study-materials/${materialId}`, {
            method: 'DELETE',
        });
    }

    // Get a specific study material by ID
    async getMaterial(materialId) {
        return this.apiCall(`/study-materials/${materialId}`);
    }

    // Download study material file
    async downloadMaterial(materialId) {
        const authData = authService.getAuthData();
        const token = authData?.token;

        if (!token) {
            throw new Error('Authentication token not found. Please login again.');
        }

        const response = await fetch(`${API_BASE_URL}/study-materials/${materialId}/download`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            let errorMessage = `Download failed with status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch {
                if (response.status === 404) {
                    errorMessage = 'File not found on server';
                } else if (response.status === 403) {
                    errorMessage = 'Access denied. You do not have permission to download this file';
                } else {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
            }
            throw new Error(errorMessage);
        }

        return response; // Return response for blob handling
    }

    // Upload file for existing material
    async uploadFileForMaterial(materialId, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);

        // Add any additional data
        Object.keys(additionalData).forEach(key => {
            if (additionalData[key] !== null && additionalData[key] !== undefined) {
                formData.append(key, additionalData[key]);
            }
        });

        return this.apiCall(`/study-materials/${materialId}/file`, {
            method: 'POST',
            body: formData,
        });
    }

    // Get material statistics
    async getMaterialStats(filters = {}) {
        const queryParams = new URLSearchParams();

        if (filters.branch_code) queryParams.append('branch_code', filters.branch_code);
        if (filters.program_id) queryParams.append('program_id', filters.program_id);
        if (filters.course_id) queryParams.append('course_id', filters.course_id);

        const endpoint = `/study-materials/stats${queryParams.toString() ? `?${queryParams}` : ''}`;
        return this.apiCall(endpoint);
    }

    // Search materials
    async searchMaterials(query, filters = {}) {
        const queryParams = new URLSearchParams();
        queryParams.append('q', query);

        if (filters.material_type) queryParams.append('material_type', filters.material_type);
        if (filters.program_id) queryParams.append('program_id', filters.program_id);
        if (filters.course_id) queryParams.append('course_id', filters.course_id);
        if (filters.branch_code) queryParams.append('branch_code', filters.branch_code);

        const endpoint = `/study-materials/search?${queryParams}`;
        return this.apiCall(endpoint);
    }

    // Bulk operations
    async bulkDeleteMaterials(materialIds) {
        return this.apiCall('/study-materials/bulk-delete', {
            method: 'DELETE',
            body: JSON.stringify({ material_ids: materialIds }),
        });
    }

    async bulkUpdateMaterials(materialIds, updateData) {
        return this.apiCall('/study-materials/bulk-update', {
            method: 'PUT',
            body: JSON.stringify({
                material_ids: materialIds,
                update_data: updateData
            }),
        });
    }
}

export const studyMaterialsAPI = new StudyMaterialsAPI();
export default studyMaterialsAPI;