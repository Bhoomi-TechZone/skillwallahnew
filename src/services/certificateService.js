import { getApiBaseUrl } from '../config/api.js';

const API_BASE_URL = getApiBaseUrl();

class CertificateService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/certificates`;
    this.adminBaseURL = `${API_BASE_URL}/api/admin/certificates`;
    
    // Fixed template path - no uploads allowed
    this.FIXED_TEMPLATE_PATH = 'london_lms/uploads/Certificate/certificate.png';
    this.FIXED_OUTPUT_PATH = 'london_lms/uploads/Certificate/generated';
  }

  // Get Authorization header
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Get multipart headers for file uploads
  getMultipartHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': token ? `Bearer ${token}` : ''
      // Note: Don't set Content-Type for FormData, browser will set it automatically
    };
  }

  // Get my certificates (student)
  async getMyCertificates() {
    try {
      console.log('🎓 Fetching student certificates...');
      
      const response = await fetch(`${this.baseURL}/my-certificates`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('❌ Error fetching student certificates:', errorData);
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Student certificates fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to fetch my certificates:', error);
      throw error;
    }
  }

  // Get certificate by ID
  async getCertificateById(certificateId) {
    try {
      const response = await fetch(`${this.baseURL}/${certificateId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch certificate:', error);
      throw error;
    }
  }

  // Download certificate
  async downloadCertificate(certificateId) {
    try {
      const response = await fetch(`${this.baseURL}/${certificateId}/download`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Return blob for download
      return await response.blob();
    } catch (error) {
      console.error('Failed to download certificate:', error);
      throw error;
    }
  }

  // Verify certificate
  async verifyCertificate(certificateId) {
    try {
      const response = await fetch(`${this.baseURL}/${certificateId}/verify`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to verify certificate:', error);
      throw error;
    }
  }

  // Request certificate for course completion
  async requestCertificate(courseId) {
    try {
      const response = await fetch(`${this.baseURL}/request`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ course_id: courseId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to request certificate:', error);
      throw error;
    }
  }

  // Admin Certificate Management

  // Get certificates based on user role with better error handling
  async getCertificates() {
    try {
      console.log('📋 Fetching certificates for current user...');
      
      // Try the working API first
      const certificatesApi = (await import('../api/certificatesApi.js')).default;
      
      try {
        // Use the basic getCertificates method that was working before
        return await certificatesApi.getCertificates();
      } catch (error) {
        console.warn('⚠️ Basic getCertificates failed, trying role-based approach:', error);
        
        // Fallback to role-based if available
        const userRole = this.getUserRole();
        console.log('👤 User role for fallback:', userRole);
        
        if (userRole === 'admin' || userRole === 'super_admin') {
          return await certificatesApi.getAllCertificates();
        } else if (userRole === 'branch_admin') {
          return await certificatesApi.getBranchCertificates();
        } else {
          return await certificatesApi.getMyCertificates();
        }
      }
      
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
      throw error;
    }
  }

  // Get user role from token or localStorage
  getUserRole() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return 'student';
      
      // Try to decode token to get role
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || payload.user_type || 'student';
    } catch (error) {
      // Fallback: check localStorage for role
      return localStorage.getItem('userRole') || localStorage.getItem('role') || 'student';
    }
  }

  // Refresh certificates (to be called after certificate generation)
  async refreshCertificates() {
    try {
      console.log('🔄 Refreshing certificates after generation...');
      
      // Add a small delay to ensure backend has processed the certificate
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return await this.getCertificates();
    } catch (error) {
      console.error('Failed to refresh certificates:', error);
      throw error;
    }
  }

  // Get all certificates (admin/branch_admin)
  async getAllCertificates() {
    try {
      console.log('📋 Fetching all certificates...');
      
      const response = await fetch(`${this.adminBaseURL}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('❌ Error fetching certificates:', errorData);
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Certificates fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('Failed to fetch all certificates:', error);
      throw error;
    }
  }

  // Create certificate (admin) - uses fixed template only
  async createCertificate(certificateData) {
    try {
      // Force fixed template path
      const fixedCertificateData = {
        ...certificateData,
        template: 'certificate-fixed',
        template_path: this.FIXED_TEMPLATE_PATH,
        use_fixed_template: true
      };
      
      console.log('🔒 Using fixed template:', this.FIXED_TEMPLATE_PATH);
      
      const response = await fetch(`${this.adminBaseURL}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(fixedCertificateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Certificate created successfully:', result);
      
      // Don't auto-refresh here to avoid delays, let the UI handle refresh
      return result;
    } catch (error) {
      console.error('Failed to create certificate:', error);
      throw error;
    }
  }

  // Update certificate (admin) - uses fixed template only
  async updateCertificate(certificateId, updateData) {
    try {
      // Force fixed template path
      const fixedUpdateData = {
        ...updateData,
        template: 'certificate-fixed',
        template_path: this.FIXED_TEMPLATE_PATH,
        use_fixed_template: true
      };
      
      console.log('🔒 Updating certificate with fixed template:', this.FIXED_TEMPLATE_PATH);
      
      const response = await fetch(`${this.adminBaseURL}/${certificateId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(fixedUpdateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update certificate:', error);
      throw error;
    }
  }

  // Delete certificate (admin)
  async deleteCertificate(certificateId) {
    try {
      const response = await fetch(`${this.adminBaseURL}/${certificateId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete certificate:', error);
      throw error;
    }
  }

  // Template upload removed - using fixed template only

  // Issue certificate to student (admin) - uses fixed template only
  async issueCertificate(certificateData) {
    try {
      // Force fixed template path
      const fixedCertificateData = {
        ...certificateData,
        template: 'certificate-fixed',
        template_path: this.FIXED_TEMPLATE_PATH,
        use_fixed_template: true
      };
      
      console.log('🔒 Issuing certificate with fixed template:', this.FIXED_TEMPLATE_PATH);
      
      const response = await fetch(`${this.adminBaseURL}/issue`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(fixedCertificateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to issue certificate:', error);
      throw error;
    }
  }

  // Bulk issue certificates (admin) - uses fixed template only
  async bulkIssueCertificates(certificatesData) {
    try {
      // Force fixed template path for all certificates
      const fixedCertificatesData = {
        ...certificatesData,
        certificates: certificatesData.certificates?.map(cert => ({
          ...cert,
          template: 'certificate-fixed',
          template_path: this.FIXED_TEMPLATE_PATH,
          use_fixed_template: true
        })) || [],
        template: 'certificate-fixed',
        template_path: this.FIXED_TEMPLATE_PATH,
        use_fixed_template: true
      };
      
      console.log('🔒 Bulk issuing certificates with fixed template:', this.FIXED_TEMPLATE_PATH);
      
      const response = await fetch(`${this.adminBaseURL}/bulk-issue`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(fixedCertificatesData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to bulk issue certificates:', error);
      throw error;
    }
  }

  // Get certificate statistics (admin)
  async getCertificateStats() {
    try {
      const response = await fetch(`${this.adminBaseURL}/stats`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch certificate stats:', error);
      throw error;
    }
  }

  // Get certificates by course (admin)
  async getCertificatesByCourse(courseId) {
    try {
      if (!courseId || courseId === 'undefined') {
        throw new Error('Invalid courseId provided to getCertificatesByCourse');
      }
      const response = await fetch(`${this.adminBaseURL}/course/${courseId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch certificates by course:', error);
      throw error;
    }
  }

  // Get certificates by student (admin)
  async getCertificatesByStudent(studentId) {
    try {
      const response = await fetch(`${this.adminBaseURL}/student/${studentId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch certificates by student:', error);
      throw error;
    }
  }

  // Get fixed template information
  getFixedTemplateInfo() {
    return {
      template: 'certificate-fixed',
      template_path: this.FIXED_TEMPLATE_PATH,
      output_path: this.FIXED_OUTPUT_PATH,
      use_fixed_template: true,
      template_locked: true
    };
  }

  // Generate certificate and refresh list (wrapper method for UI)
  async generateCertificate(certificateData) {
    try {
      console.log('🎓 Generating certificate for UI...');
      
      // Create the certificate
      const result = await this.createCertificate(certificateData);
      
      console.log('✅ Certificate generated, triggering UI refresh');
      
      // Return result with refresh flag for UI
      return {
        ...result,
        shouldRefresh: true
      };
    } catch (error) {
      console.error('Failed to generate certificate for UI:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const certificateService = new CertificateService();
export default certificateService;
