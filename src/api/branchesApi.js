// API endpoints for branches management
const API_BASE_URL = 'http://localhost:4000';

// Get authentication token
const getAuthToken = () => {
    const token = localStorage.getItem('token') ||
        localStorage.getItem('adminToken') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('instructorToken') ||
        localStorage.getItem('studentToken');

    return token || 'demo_token_for_development';
};

/**
 * Fetch all branches from the backend
 * @returns {Promise} Promise resolving to branches array
 */
export const fetchBranches = async () => {
    try {
        const token = getAuthToken();

        const endpoints = [
            '/api/branch/branches/dropdown',
            '/branches/dropdown',
            '/branches'
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`Trying branches endpoint: ${API_BASE_URL}${endpoint}`);

                const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ Success with branches endpoint: ${endpoint}`, data);

                    // Handle different response formats
                    if (data.success && data.branches) {
                        return { success: true, branches: data.branches, message: 'Branches fetched successfully' };
                    } else if (data.branches) {
                        return { success: true, branches: data.branches, message: 'Branches fetched successfully' };
                    } else if (Array.isArray(data)) {
                        return { success: true, branches: data, message: 'Branches fetched successfully' };
                    }

                    return data;
                }
            } catch (error) {
                console.log(`❌ Failed with endpoint: ${endpoint}`, error.message);
                continue;
            }
        }

        // If all endpoints fail, return empty array
        console.log('All branches endpoints failed, returning empty array');
        return { success: true, branches: [], message: 'No branches found' };

    } catch (error) {
        console.error('Error fetching branches:', error);
        return { success: false, branches: [], message: error.message };
    }
};

/**
 * Get branch details by ID
 * @param {string} branchId - Branch ID
 * @returns {Promise} Promise resolving to branch details
 */
export const getBranchById = async (branchId) => {
    try {
        const token = getAuthToken();

        const endpoints = [
            `/api/branch/branches/${branchId}`,
            `/branches/${branchId}`
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.branch || data;
                }
            } catch (error) {
                continue;
            }
        }

        throw new Error('Branch not found');
    } catch (error) {
        console.error('Error fetching branch details:', error);
        throw error;
    }
};

/**
 * Create a new branch
 * @param {Object} branchData - Branch data
 * @returns {Promise} Promise resolving to created branch
 */
export const createBranch = async (branchData) => {
    try {
        const token = getAuthToken();

        const response = await fetch(`${API_BASE_URL}/api/branch/branches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(branchData),
        });

        if (!response.ok) {
            throw new Error('Failed to create branch');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error creating branch:', error);
        throw error;
    }
};

/**
 * Update a branch
 * @param {string} branchId - Branch ID
 * @param {Object} branchData - Updated branch data
 * @returns {Promise} Promise resolving to updated branch
 */
export const updateBranch = async (branchId, branchData) => {
    try {
        const token = getAuthToken();

        const response = await fetch(`${API_BASE_URL}/api/branch/branches/${branchId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(branchData),
        });

        if (!response.ok) {
            throw new Error('Failed to update branch');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating branch:', error);
        throw error;
    }
};

/**
 * Delete a branch
 * @param {string} branchId - Branch ID
 * @returns {Promise} Promise resolving to deletion confirmation
 */
export const deleteBranch = async (branchId) => {
    try {
        const token = getAuthToken();

        const response = await fetch(`${API_BASE_URL}/api/branch/branches/${branchId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to delete branch');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error deleting branch:', error);
        throw error;
    }
};

/**
 * Get branches (alias for fetchBranches for compatibility)
 * @param {string} franchiseCode - Optional franchise code filter
 * @returns {Promise} Promise resolving to branches array
 */
export const getBranches = async (franchiseCode) => {
    try {
        const token = getAuthToken();

        // Build endpoint with franchise code as path parameter
        let endpoint = '/api/branch/branches';
        if (franchiseCode) {
            endpoint += `/${franchiseCode}`;
        }

        console.log(`Trying branches endpoint: ${API_BASE_URL}${endpoint}`);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Success with branches endpoint`, data);

            // Handle different response formats
            if (data.success && data.branches) {
                return { success: true, branches: data.branches, message: 'Branches fetched successfully' };
            } else if (data.branches) {
                return { success: true, branches: data.branches, message: 'Branches fetched successfully' };
            } else if (Array.isArray(data)) {
                return { success: true, branches: data, message: 'Branches fetched successfully' };
            }

            return data;
        } else {
            throw new Error(`Failed to fetch branches: ${response.status}`);
        }
    } catch (error) {
        console.error('Error fetching branches:', error);
        throw error;
    }
};

// Export as named export for compatibility
export const branchesApi = {
    fetchBranches,
    getBranches,
    getBranchById,
    createBranch,
    updateBranch,
    deleteBranch
};

// Also export as default
export default branchesApi;
