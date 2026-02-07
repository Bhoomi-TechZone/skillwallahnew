const BASE_URL = 'http://localhost:4000';

// Helper function to get authentication headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (jsonError) {
      const text = await response.text();
      console.error('[DEBUG] Failed to parse JSON:', text.substring(0, 200));
      throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
    }
  } else {
    const text = await response.text();
    console.error('[DEBUG] Unexpected content-type:', contentType);
    console.error('[DEBUG] Response text:', text.substring(0, 200));
    throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}: ${text.substring(0, 100)}`);
  }
};

// Enquiries API
export const enquiriesApi = {
  // Get all enquiries from both enquiry and partnership endpoints
  async getAllEnquiries() {
    try {
      const headers = getAuthHeaders();
      let allEnquiries = [];

      console.log('[ENQUIRIES] Starting fetch from backend endpoints...');
      console.log('[ENQUIRIES] Auth token present:', !!localStorage.getItem('token'));

      // Fetch partnership requests - actual backend endpoint
      try {
        const partnershipEndpoint = `${BASE_URL}/partnership_requests`;
        console.log(`[ENQUIRIES] Fetching from: ${partnershipEndpoint}`);

        const partnershipResponse = await fetch(partnershipEndpoint, {
          method: 'GET',
          headers
        });

        console.log(`[ENQUIRIES] Partnership response status: ${partnershipResponse.status}`);

        // Check if response is HTML instead of JSON
        const contentType = partnershipResponse.headers.get('content-type');
        console.log(`[ENQUIRIES] Partnership content-type: ${contentType}`);

        if (contentType && contentType.includes('text/html')) {
          console.warn(`[ENQUIRIES] Partnership endpoint returned HTML - endpoint may not exist`);
        } else if (partnershipResponse.ok) {
          try {
            const partnershipData = await partnershipResponse.json();
            console.log(`[ENQUIRIES] ✅ Partnership data:`, partnershipData);

            // Handle response structure: {message, count, data}
            const partnershipEnquiries = partnershipData.data && Array.isArray(partnershipData.data)
              ? partnershipData.data
              : (Array.isArray(partnershipData) ? partnershipData : []);

            if (partnershipEnquiries.length > 0) {
              // Add source identifier to distinguish types
              const processedPartnershipEnquiries = partnershipEnquiries.map(enquiry => ({
                ...enquiry,
                source: 'partnership'
              }));

              allEnquiries = [...allEnquiries, ...processedPartnershipEnquiries];
              console.log(`[ENQUIRIES] ✅ Found ${partnershipEnquiries.length} partnership enquiries`);
            } else {
              console.log('[ENQUIRIES] Partnership endpoint returned empty array');
            }
          } catch (jsonError) {
            console.error(`[ENQUIRIES] Failed to parse partnership JSON:`, jsonError.message);
          }
        } else {
          console.warn(`[ENQUIRIES] Partnership endpoint failed with status: ${partnershipResponse.status}`);
          const errorText = await partnershipResponse.text();
          console.warn(`[ENQUIRIES] Partnership error response:`, errorText.substring(0, 200));
        }
      } catch (partnershipError) {
        console.error(`[ENQUIRIES] Partnership endpoint error:`, partnershipError.message);
      }

      // Fetch enquiries from enquiry endpoint - actual backend endpoint
      try {
        const enquiryEndpoint = `${BASE_URL}/enquiry/`;
        console.log(`[ENQUIRIES] Fetching from: ${enquiryEndpoint}`);

        const enquiryResponse = await fetch(enquiryEndpoint, {
          method: 'GET',
          headers
        });

        console.log(`[ENQUIRIES] Enquiry response status: ${enquiryResponse.status}`);

        // Check if response is HTML instead of JSON
        const contentType = enquiryResponse.headers.get('content-type');
        console.log(`[ENQUIRIES] Enquiry content-type: ${contentType}`);

        if (contentType && contentType.includes('text/html')) {
          console.warn(`[ENQUIRIES] Enquiry endpoint returned HTML - endpoint may not exist`);
        } else if (enquiryResponse.ok) {
          try {
            const enquiryData = await enquiryResponse.json();
            console.log(`[ENQUIRIES] ✅ Enquiry data:`, enquiryData);

            // Handle response structure: {enquiries: [...], total: 28} - backend returns this format
            let enquiryList = [];
            if (enquiryData.enquiries && Array.isArray(enquiryData.enquiries)) {
              enquiryList = enquiryData.enquiries;
            } else if (enquiryData.data && Array.isArray(enquiryData.data)) {
              enquiryList = enquiryData.data;
            } else if (Array.isArray(enquiryData)) {
              enquiryList = enquiryData;
            }

            if (enquiryList.length > 0) {
              // Add source identifier
              const processedEnquiries = enquiryList.map(enquiry => ({
                ...enquiry,
                source: 'enquiry'
              }));

              allEnquiries = [...allEnquiries, ...processedEnquiries];
              console.log(`[ENQUIRIES] ✅ Found ${enquiryList.length} general enquiries`);
            } else {
              console.log('[ENQUIRIES] Enquiry endpoint returned empty array');
            }
          } catch (jsonError) {
            console.error(`[ENQUIRIES] Failed to parse enquiry JSON:`, jsonError.message);
          }
        } else {
          console.warn(`[ENQUIRIES] Enquiry endpoint failed with status: ${enquiryResponse.status}`);
          const errorText = await enquiryResponse.text();
          console.warn(`[ENQUIRIES] Enquiry error response:`, errorText.substring(0, 200));
        }
      } catch (enquiryError) {
        console.error(`[ENQUIRIES] Enquiry endpoint error:`, enquiryError.message);
      }

      console.log(`[ENQUIRIES] ✅ Final result: ${allEnquiries.length} total enquiries`);

      if (allEnquiries.length === 0) {
        console.error('[ENQUIRIES] ❌ No enquiries found from any endpoint');
        console.error('[ENQUIRIES] This could mean:');
        console.error('  • The database has no enquiry records yet');
        console.error('  • Authentication/permission issues');
        console.error('  • Backend API is returning empty results');
        throw new Error(`No enquiries returned from backend. Both endpoints responded but returned empty arrays. This may mean there are no enquiries in the database yet, or there are permission/authentication issues.`);
      }

      return allEnquiries;

    } catch (error) {
      console.error('[ENQUIRIES] Final error:', error);
      throw error;
    }
  },

  // Get enquiry by ID
  async getEnquiryById(id) {
    try {
      const response = await fetch(`${BASE_URL}/enquiry/${id}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching enquiry by ID:', error);
      throw error;
    }
  },

  // Update enquiry status
  async updateEnquiryStatus(id, status) {
    try {
      const response = await fetch(`${BASE_URL}/enquiry/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error updating enquiry status:', error);
      throw error;
    }
  },

  // Create response to enquiry
  async createEnquiryResponse(enquiryId, responseData) {
    try {
      const response = await fetch(`${BASE_URL}/enquiry/${enquiryId}/response`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(responseData)
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error creating enquiry response:', error);
      throw error;
    }
  },

  // Get enquiry statistics
  async getEnquiryStats() {
    try {
      const response = await fetch(`${BASE_URL}/enquiry/stats`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error fetching enquiry stats:', error);
      throw error;
    }
  }
};

export default enquiriesApi;