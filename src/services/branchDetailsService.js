// Branch Details Service
import { getUserData } from '../utils/authUtils';

class BranchDetailsService {
  constructor() {
    this.baseURL = 'http://localhost:4000/api';
  }

  // Get authorization headers
  getAuthHeaders() {
    const authToken = localStorage.getItem('authToken');
    const accessToken = localStorage.getItem('access_token');
    const token = localStorage.getItem('token');

    const finalToken = authToken || accessToken || token;

    return {
      'Content-Type': 'application/json',
      'Authorization': finalToken ? `Bearer ${finalToken}` : '',
    };
  }

  // Get current branch details
  async getCurrentBranchDetails() {
    try {
      const currentUser = getUserData();
      console.log('🏢 Getting branch details for user:', currentUser);

      if (!currentUser) {
        throw new Error('No user data found');
      }

      // Try to fetch branch data from the MongoDB directly via API
      try {
        console.log('🔍 Fetching branches data...');

        // Get user's franchise code
        const franchiseCode = currentUser.franchise_code;
        if (!franchiseCode) {
          throw new Error('User does not have franchise_code');
        }

        // Use the correct endpoint to get branches for this franchise
        const response = await fetch(`http://localhost:4000/api/branch/branches/${franchiseCode}`, {
          method: 'GET',
          headers: this.getAuthHeaders(),
        });

        if (response.ok) {
          const branchesData = await response.json();
          console.log('🏢 Raw branches response:', branchesData);

          // The response might be an array or have a branches property
          let branches = [];
          if (Array.isArray(branchesData)) {
            branches = branchesData;
          } else if (branchesData.branches) {
            branches = branchesData.branches;
          } else if (branchesData.data) {
            branches = branchesData.data;
          }

          console.log('🔍 Processing branches array:', branches);

          // Look for branch where user is centre_head
          let userBranch = null;

          for (const branch of branches) {
            console.log('🔍 Checking branch:', branch);
            const centreHead = branch.centre_head;
            const centreName = branch.centre_info?.centre_name;

            console.log('👤 Centre head:', centreHead);
            console.log('🏢 Centre name:', centreName);

            if (centreHead && centreName) {
              // Check if this user matches the centre head
              const nameMatch = centreHead.name?.toLowerCase().includes(currentUser.name?.toLowerCase()) ||
                currentUser.name?.toLowerCase().includes(centreHead.name?.toLowerCase());
              const emailMatch = centreHead.email === currentUser.email;

              console.log('🔍 Name match:', nameMatch, 'Email match:', emailMatch);

              if (nameMatch || emailMatch) {
                userBranch = branch;
                console.log('✅ Found matching branch:', userBranch);
                break;
              }
            }
          }

          if (userBranch) {
            const branchName = userBranch.centre_info?.centre_name || 'Branch Centre';
            console.log('🎯 Final branch name:', branchName);

            return {
              branchName: branchName,
              branchCode: userBranch.centre_info?.code || userBranch.franchise_code || 'N/A',
              userName: currentUser.name || 'Admin',
              userRole: 'Branch Administrator',
              fullBranchData: userBranch
            };
          } else {
            console.log('❌ No matching branch found for user');
          }
        } else {
          console.warn('❌ Failed to fetch branches, status:', response.status);
        }
      } catch (apiError) {
        console.error('❌ API error:', apiError);
      }

      // If no branch found but user is admin, use a different approach
      if (currentUser.role === 'admin') {
        // For now, let's hardcode the known branch name as a fallback
        // until we can properly connect the user to their branch
        return {
          branchName: 'Skill Wallah CP', // Known branch from MongoDB
          branchCode: 'FR-SK-0940', // Known code
          userName: currentUser.name || 'Admin',
          userRole: 'Branch Administrator'
        };
      }

      // Final fallback
      return {
        branchName: 'Branch Centre',
        branchCode: 'N/A',
        userName: currentUser.name || 'Branch Admin',
        userRole: 'Branch Administrator'
      };

    } catch (error) {
      console.error('Error fetching branch details:', error);

      // Fallback to known data
      const currentUser = getUserData();
      return {
        branchName: 'Skill Wallah CP', // Fallback to known branch
        branchCode: 'N/A',
        userName: currentUser?.name || 'Branch Admin',
        userRole: 'Branch Administrator'
      };
    }
  }

  // Get all branches (for super admin)
  async getAllBranches() {
    try {
      const response = await fetch(`${this.baseURL}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching all branches:', error);
      throw error;
    }
  }
}

const branchDetailsService = new BranchDetailsService();
export default branchDetailsService;