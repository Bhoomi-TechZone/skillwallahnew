// Branch Certificates & Marksheets API Service
import authService from '../services/authService';
import { getApiBaseUrl } from '../config/api';

// Use centralized API configuration
const API_BASE_URL = getApiBaseUrl();

// Debug logging
console.log('🔍 [CERTIFICATES-API] Environment Debug:', {
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE,
  PROD: import.meta.env.PROD,
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  FINAL_API_BASE_URL: API_BASE_URL
});

class CertificatesAPI {
    // Helper method to make authenticated API calls
    async apiCall(endpoint, options = {}) {
        try {
            console.log(`🌐 Making API call to: ${API_BASE_URL}${endpoint}`);
            console.log('📋 Request options:', options);
            console.log('📦 Request body (if JSON):', options.body && typeof options.body === 'string' ? JSON.parse(options.body) : options.body);
            
            const token = authService.getToken();
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

            console.log(`📡 Response status: ${response.status} for ${endpoint}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ API Error Response: ${errorText}`);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log(`✅ API Success for ${endpoint}:`, result);
            return result;
        } catch (error) {
            console.error(`API call failed for ${endpoint}:`, error);
            throw error;
        }
    }

    // ===== TEMPLATE MANAGEMENT =====
    
    // Get available certificate templates
    async getTemplates() {
        try {
            const templates = await this.apiCall('/api/branch-certificates/templates');
            return templates;
        } catch (error) {
            console.error('Error fetching certificate templates:', error);
            // Return fallback templates if API fails
            return {
                success: true,
                templates: [
                    {
                        id: 'certificate-png',
                        name: 'Default Certificate Template',
                        description: 'Standard certificate template',
                        path: '/uploads/Certificate/certificate.png',
                        filename: 'certificate.png',
                        created_at: new Date().toISOString()
                    }
                ]
            };
        }
    }

    // ===== CERTIFICATES =====

    // Get all certificates from branch_certificates collection using exact curl endpoint format
    async getCertificates(filters = {}) {
        console.log('📞 getCertificates called with filters:', filters);
        console.log('🎯 Using exact curl endpoint: /api/branch/certificates');
        
        // Verify authentication token first
        const token = authService.getToken();
        if (!token) {
            throw new Error('No authentication token found. Please login again.');
        }
        console.log('🔑 Authentication token found:', token.substring(0, 20) + '...');
        
        const queryParams = new URLSearchParams();
        
        // Add pagination parameters
        queryParams.append('skip', filters.skip || '0');
        queryParams.append('limit', filters.limit || '100');
        
        if (filters.student_id) queryParams.append('student_id', filters.student_id);
        if (filters.course_id) queryParams.append('course_id', filters.course_id);
        if (filters.certificate_type) queryParams.append('certificate_type', filters.certificate_type);
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.branch_id) queryParams.append('branch_id', filters.branch_id);
        
        // Exact endpoint from curl command - fetches from branch_certificates collection
        const endpoint = `/api/branch/certificates${queryParams.toString() ? `?${queryParams}` : ''}`;
        console.log('🔗 Branch certificates endpoint (curl format):', endpoint);
        
        try {
            const response = await this.apiCall(endpoint);
            console.log('📊 Raw certificates API response:', response);
            
            // Return the response as-is, let the component handle extraction
            return response;
            
        } catch (error) {
            console.error('❌ Error fetching certificates:', error);
            
            // More specific error messages based on response status
            if (error.message.includes('401')) {
                throw new Error('Authentication failed. Please login again.');
            } else if (error.message.includes('403')) {
                throw new Error('Access denied. You may not have permission to view certificates.');
            } else if (error.message.includes('404')) {
                throw new Error('Certificate endpoint not found. Please contact support.');
            } else if (error.message.includes('500')) {
                throw new Error('Server error occurred. Please try again later.');
            } else {
                throw error;
            }
        }
    }

    // Get all certificates for admin/branch_admin role
    async getAllCertificates(filters = {}) {
        console.log('📞 API Call: getAllCertificates for admin/branch_admin');
        
        const queryParams = new URLSearchParams();
        if (filters.student_id) queryParams.append('student_id', filters.student_id);
        if (filters.course_id) queryParams.append('course_id', filters.course_id);
        if (filters.certificate_type) queryParams.append('certificate_type', filters.certificate_type);
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.branch_id) queryParams.append('branch_id', filters.branch_id);
        
        const endpoint = `/api/admin/certificates${queryParams.toString() ? `?${queryParams}` : ''}`;
        console.log('🔗 Calling admin endpoint:', endpoint);
        
        return this.apiCall(endpoint);
    }

    // Get certificates for branch admin role (branch-specific)
    async getBranchCertificates(filters = {}) {
        console.log('📞 API Call: getBranchCertificates for branch_admin');
        
        const queryParams = new URLSearchParams();
        if (filters.student_id) queryParams.append('student_id', filters.student_id);
        if (filters.course_id) queryParams.append('course_id', filters.course_id);
        if (filters.certificate_type) queryParams.append('certificate_type', filters.certificate_type);
        if (filters.status) queryParams.append('status', filters.status);
        
        const endpoint = `/api/branch/certificates${queryParams.toString() ? `?${queryParams}` : ''}`;
        console.log('🔗 Calling branch endpoint:', endpoint);
        
        return this.apiCall(endpoint);
    }

    // Get student's own certificates
    async getMyCertificates() {
        console.log('📞 API Call: getMyCertificates for student');
        console.log('🔗 Calling student endpoint: /api/student/my-certificates');
        
        return this.apiCall('/api/student/my-certificates');
    }

    // Helper method to get certificates based on user role
    async getCertificatesByRole(userRole, filters = {}) {
        console.log('📞 API Call: getCertificatesByRole with role:', userRole);
        
        try {
            switch (userRole) {
                case 'admin':
                case 'super_admin':
                    return this.getAllCertificates(filters);
                    
                case 'branch_admin':
                case 'branch':
                    return this.getBranchCertificates(filters);
                    
                case 'student':
                    return this.getMyCertificates();
                    
                default:
                    console.warn('⚠️ Unknown user role, defaulting to branch certificates:', userRole);
                    return this.getBranchCertificates(filters);
            }
        } catch (error) {
            console.error('❌ Role-based certificate fetch failed, falling back to default:', error);
            
            // Fallback to the original getCertificates method
            return this.getCertificates(filters);
        }
    }

    // Generate new certificate - Enhanced with STRONG cache busting
    async generateCertificate(certificateData) {
        console.log('📞 API Call: generateCertificate with data:', certificateData);
        console.log('🔗 Calling endpoint: /api/branch/certificates/generate');
        
        // Add STRONG cache busting and unique identifiers to ensure fresh generation
        const enhancedData = {
            ...certificateData,
            generation_timestamp: Date.now(),
            cache_bust: Date.now(),
            unique_request_id: `genreq_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`,
            force_new_generation: true,
            bypass_existing_check: true,
            always_create_new: true,
            delete_existing_first: true,
            api_session_id: `apisess_${Math.random().toString(36).substr(2, 16)}`,
            
            // Add timestamp to the actual certificate content
            api_generation_time: new Date().toISOString(),
            frontend_timestamp: Date.now(),
            request_fingerprint: btoa(`${Date.now()}_${Math.random()}_${JSON.stringify(certificateData).length}`).replace(/[^a-zA-Z0-9]/g, '').substr(0, 20)
        };
        
        console.log('🚀 SENDING ENHANCED DATA TO BACKEND:', enhancedData);
        console.log('🔑 KEY UNIQUE FIELDS:');
        console.log('  - Request ID:', enhancedData.unique_request_id);
        console.log('  - Generation Time:', enhancedData.api_generation_time);
        console.log('  - Certificate Number:', enhancedData.certificate_number);
        console.log('  - Student Name:', enhancedData.student_name);
        console.log('  - Unique Certificate ID:', enhancedData.unique_certificate_id);
        
        return this.apiCall('/api/branch/certificates/generate', {
            method: 'POST',
            body: JSON.stringify(enhancedData),
        });
    }

    // Upload student photo separately - NEW METHOD
    async uploadStudentPhoto(photoFile, studentId) {
        console.log('📞 API Call: uploadStudentPhoto');
        console.log('🔗 Calling endpoint: /api/branch/students/upload-photo');
        
        const formData = new FormData();
        formData.append('photo', photoFile);
        formData.append('student_id', studentId);
        
        const token = authService.getToken();
        const response = await fetch(`${API_BASE_URL}/api/branch/students/upload-photo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Don't set Content-Type for FormData
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Photo Upload Error:', response.status, errorText);
            throw new Error(`Photo upload failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return result.photo_url || result.url; // Return the photo URL
    }

    // Upload certificate template - NEW METHOD
    async uploadTemplate(templateFile) {
        const formData = new FormData();
        formData.append('template', templateFile);
        
        return this.apiCall('/api/branch/certificates/upload-template', {
            method: 'POST',
            body: formData,
        });
    }

    // Update existing certificate - NEW METHOD
    async updateCertificate(certificateId, certificateData) {
        return this.apiCall(`/api/branch/certificates/${certificateId}`, {
            method: 'PUT',
            body: JSON.stringify(certificateData),
        });
    }

    // Regenerate certificate file - Enhanced with STRONG cache busting
    async regenerateCertificate(certificateId, additionalData = {}) {
        console.log('📞 API Call: regenerateCertificate for:', certificateId);
        console.log('🔄 Additional regeneration data:', additionalData);
        console.log('🔗 Calling endpoint: /api/branch/certificates/${certificateId}/regenerate');
        
        const requestBody = {
            ...additionalData,
            force_regenerate: true,
            cache_bust: Date.now(),
            regeneration_timestamp: Date.now(),
            unique_regen_id: `regen_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`,
            delete_old_first: true,
            force_new_file_creation: true,
            bypass_cache_completely: true
        };
        
        return this.apiCall(`/api/branch/certificates/${certificateId}/regenerate`, {
            method: 'POST',
            body: JSON.stringify(requestBody),
        });
    }

    // Delete certificate
    async deleteCertificate(certificateId) {
        return this.apiCall(`/api/branch/certificates/${certificateId}`, {
            method: 'DELETE',
        });
    }

    // Download certificate - Updated to use branch endpoint
    async downloadCertificate(certificateId) {
        const token = authService.getToken();
        return fetch(`${API_BASE_URL}/api/branch/certificates/${certificateId}/download`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

    // ===== MARKSHEETS =====

    // Get all marksheets with optional filtering
    async getMarksheets(filters = {}) {
        console.log('📞 getMarksheets called with filters:', filters);
        
        // Use the branch marksheets endpoint to fetch from branch_marksheets collection
        const queryParams = new URLSearchParams();
        
        // Add pagination parameters
        queryParams.append('skip', filters.skip || '0');
        queryParams.append('limit', filters.limit || '100');
        
        // Add filtering parameters if provided
        if (filters.student_id) queryParams.append('student_id', filters.student_id);
        if (filters.course_id) queryParams.append('course_id', filters.course_id);
        if (filters.semester) queryParams.append('semester', filters.semester);
        if (filters.session_year) queryParams.append('session_year', filters.session_year);
        if (filters.status) queryParams.append('status', filters.status);
        
        // Primary endpoint for branch_marksheets collection
        const endpoint = `/api/branch/marksheets${queryParams.toString() ? `?${queryParams}` : ''}`;
        console.log('🔗 Using branch marksheets endpoint:', endpoint);
        
        try {
            const response = await this.apiCall(endpoint);
            console.log('📊 Raw marksheets API response:', response);
            
            // Handle different response structures
            let marksheets = [];
            if (response) {
                if (response.marksheets && Array.isArray(response.marksheets)) {
                    marksheets = response.marksheets;
                } else if (response.data && Array.isArray(response.data)) {
                    marksheets = response.data;
                } else if (Array.isArray(response)) {
                    marksheets = response;
                } else if (response.results && Array.isArray(response.results)) {
                    marksheets = response.results;
                }
            }
            
            console.log('✅ Processed marksheets:', marksheets.length, 'items');
            console.log('🔍 Sample marksheet:', marksheets[0]);
            
            return {
                data: marksheets,
                marksheets: marksheets,
                total: marksheets.length,
                ...response
            };
        } catch (error) {
            console.error('❌ Error fetching marksheets from branch endpoint:', error);
            
            // Fallback: try admin marksheets endpoint
            try {
                console.log('🔄 Trying admin marksheets fallback endpoint...');
                const adminEndpoint = `/api/admin/marksheets${queryParams.toString() ? `?${queryParams}` : ''}`;
                console.log('🔗 Admin fallback endpoint:', adminEndpoint);
                
                const fallbackResponse = await this.apiCall(adminEndpoint);
                console.log('📊 Admin fallback response:', fallbackResponse);
                
                let fallbackMarksheets = [];
                if (fallbackResponse) {
                    if (fallbackResponse.marksheets && Array.isArray(fallbackResponse.marksheets)) {
                        fallbackMarksheets = fallbackResponse.marksheets;
                    } else if (fallbackResponse.data && Array.isArray(fallbackResponse.data)) {
                        fallbackMarksheets = fallbackResponse.data;
                    } else if (Array.isArray(fallbackResponse)) {
                        fallbackMarksheets = fallbackResponse;
                    }
                }
                
                return {
                    data: fallbackMarksheets,
                    marksheets: fallbackMarksheets,
                    total: fallbackMarksheets.length,
                    ...fallbackResponse
                };
            } catch (fallbackError) {
                console.error('❌ Admin marksheets fallback also failed:', fallbackError);
                throw fallbackError;
            }
        }
    }

    // Generate new marksheet with template support
    async generateMarksheet(marksheetIdOrData, marksheetData = null) {
        // If called with single parameter, it's marksheet data for new creation
        if (marksheetData === null && typeof marksheetIdOrData === 'object') {
            console.log('🆕 Creating new marksheet with data:', marksheetIdOrData);
            return this.apiCall('/api/branch/marksheets/generate', {
                method: 'POST',
                body: JSON.stringify({
                    ...marksheetIdOrData,
                    template_path: 'london_lms/uploads/Marksheet/marksheet.jpeg',
                    output_path: 'london_lms/uploads/Marksheet/generated'
                }),
            });
        }
        
        // If called with two parameters, first is marksheetId for updating existing
        if (marksheetIdOrData && marksheetData) {
            console.log('🔄 Updating existing marksheet:', marksheetIdOrData, 'with data:', marksheetData);
            return this.apiCall(`/api/branch/marksheets/${marksheetIdOrData}/generate`, {
                method: 'POST',
                body: JSON.stringify({
                    ...marksheetData,
                    template_path: 'london_lms/uploads/Marksheet/marksheet.jpeg',
                    output_path: 'london_lms/uploads/Marksheet/generated'
                }),
            });
        }
        
        // Fallback case - treat as new marksheet if unclear
        console.log('📝 Fallback: Creating new marksheet');
        return this.apiCall('/api/branch/marksheets/generate', {
            method: 'POST',
            body: JSON.stringify({
                ...marksheetIdOrData,
                template_path: 'london_lms/uploads/Marksheet/marksheet.jpeg',
                output_path: 'london_lms/uploads/Marksheet/generated'
            }),
        });
    }

    // Create new marksheet (without immediate generation)
    async createMarksheet(marksheetData) {
        return this.apiCall('/api/branch/marksheets', {
            method: 'POST',
            body: JSON.stringify(marksheetData),
        });
    }

    // Generate marksheet PDF/Image from existing marksheet
    async generateMarksheetDocument(marksheetId, templateOptions = {}) {
        return this.apiCall(`/api/branch/marksheets/${marksheetId}/document`, {
            method: 'POST',
            body: JSON.stringify({
                template: 'marksheet-template',
                template_path: '/uploads/Marksheet/Marksheet.jpeg',
                format: 'pdf', // or 'jpeg'
                ...templateOptions
            }),
        });
    }

    // Update existing marksheet - NEW METHOD
    async updateMarksheet(marksheetId, marksheetData) {
        return this.apiCall(`/api/branch/marksheets/${marksheetId}`, {
            method: 'PUT',
            body: JSON.stringify(marksheetData),
        });
    }

    // Delete marksheet
    async deleteMarksheet(marksheetId) {
        return this.apiCall(`/api/branch/marksheets/${marksheetId}`, {
            method: 'DELETE',
        });
    }

    // Download marksheet
    async downloadMarksheet(marksheetId) {
        const token = authService.getToken();
        return fetch(`${API_BASE_URL}/api/branch/marksheets/${marksheetId}/download`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

    // ===== ID CARDS =====

    // Get all ID cards with optional filtering - Updated to use branch endpoint
    async getIdCards(filters = {}) {
        const queryParams = new URLSearchParams();
        
        if (filters.student_id) queryParams.append('student_id', filters.student_id);
        if (filters.card_type) queryParams.append('card_type', filters.card_type);
        if (filters.status) queryParams.append('status', filters.status);
        
        const endpoint = `/branch/id-cards${queryParams.toString() ? `?${queryParams}` : ''}`;
        return this.apiCall(endpoint);
    }

    // Generate new ID card - Updated to use branch endpoint
    async generateIdCard(idCardData) {
        return this.apiCall('/api/branch/id-cards/generate', {
            method: 'POST',
            body: JSON.stringify(idCardData),
        });
    }

    // Download ID card image - Updated to use branch endpoint
    async downloadIdCard(cardId) {
        const token = authService.getToken();
        return fetch(`${API_BASE_URL}/branch/id-cards/${cardId}/download`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

    // ===== STATISTICS =====

    // Get comprehensive statistics for certificates and marksheets
    async getStats() {
        // Use the dedicated stats endpoint from backend
        try {
            return this.apiCall('/api/branch/certificates-marksheets/stats');
        } catch (error) {
            console.error('Error getting stats:', error);
            // Return default stats on error
            return {
                certificates: { total: 0, issued: 0, draft: 0, cancelled: 0 },
                marksheets: { total: 0, published: 0, draft: 0, withheld: 0 },
                students_covered: 0,
                success_rate: 0
            };
        }
    }

    // ===== TEMPLATES =====

    // Get available certificate templates
    async getTemplates() {
        try {
            return this.apiCall('/api/branch/certificates/templates');
        } catch (error) {
            console.warn('Templates API not available, using fallback templates:', error);
            // Return fallback templates when API is not available
            return {
                available: true,
                message: 'Using default templates',
                templates: [
                    {
                        id: 'default',
                        name: 'Default Certificate Template',
                        description: 'Standard certificate design',
                        path: '/uploads/Certificate/certificate_template.png',
                        preview: null
                    },
                    {
                        id: 'certificate-jpeg',
                        name: 'Certificate Template (JPEG)',
                        description: 'Alternative certificate format',
                        path: '/uploads/Certificate/Certificate.jpeg',
                        preview: null
                    }
                ]
            };
        }
    }

    // ===== UTILITY METHODS =====

    // Download any document by type and ID
    async downloadDocument(documentType, documentId) {
        const token = authService.getToken();
        return fetch(`${API_BASE_URL}/branch-certificates/download/${documentType}/${documentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }

    // Test template availability
    async testTemplate() {
        return this.apiCall('/api/branch-certificates/test-template');
    }

    // Test ID card generation
    async testGenerateIdCard() {
        return this.apiCall('/api/branch-certificates/test-generate', {
            method: 'POST'
        });
    }
    
    // Upload certificate template
    async uploadTemplate(templateFile) {
        const formData = new FormData();
        formData.append('template', templateFile);
        
        return this.apiCall('/api/branch/certificates/upload-template', {
            method: 'POST',
            body: formData,
        });
    }
}

export const certificatesAPI = new CertificatesAPI();

// Legacy export for backward compatibility
export const certificatesApi = certificatesAPI;

// ID Card API export for compatibility
export const idCardApi = certificatesAPI;