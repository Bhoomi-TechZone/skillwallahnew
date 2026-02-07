const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

class BranchIdCardService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/api/branch`;
  }

  getAuthHeaders() {
    const token = localStorage.getItem('token') || localStorage.getItem('branchToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Get all ID cards for the branch
  async getIdCards(filters = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (filters.student_id) {
        queryParams.append('student_id', filters.student_id);
      }
      if (filters.status) {
        queryParams.append('status', filters.status);
      }

      const url = `${this.baseURL}/id-cards${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      console.log('📋 [ID CARD SERVICE] Fetching ID cards from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [ID CARD SERVICE] Error response:', errorText);
        throw new Error(`Failed to fetch ID cards: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [ID CARD SERVICE] ID cards fetched:', data);
      return data;
    } catch (error) {
      console.error('❌ [ID CARD SERVICE] Error fetching ID cards:', error);
      throw error;
    }
  }

  // Generate ID card for a student
  async generateIdCard(studentId, cardType = 'student') {
    try {
      console.log('📋 [ID CARD SERVICE] Generating ID card for student:', studentId);

      const response = await fetch(`${this.baseURL}/id-cards/generate`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          student_id: studentId,
          card_type: cardType
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [ID CARD SERVICE] Error response:', errorText);
        throw new Error(`Failed to generate ID card: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [ID CARD SERVICE] ID card generated:', data);
      return data;
    } catch (error) {
      console.error('❌ [ID CARD SERVICE] Error generating ID card:', error);
      throw error;
    }
  }

  // Download ID card
  async downloadIdCard(cardId) {
    try {
      console.log('📥 [ID CARD SERVICE] Downloading ID card:', cardId);

      const response = await fetch(`${this.baseURL}/id-cards/${cardId}/download`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to download ID card: ${response.status}`);
      }

      // Get the blob data
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `id_card_${cardId}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('✅ [ID CARD SERVICE] ID card downloaded successfully');
      return true;
    } catch (error) {
      console.error('❌ [ID CARD SERVICE] Error downloading ID card:', error);
      throw error;
    }
  }
}

export default new BranchIdCardService();
