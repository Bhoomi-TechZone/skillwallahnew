// Support Service for handling customer support tickets and responses
import { getApiBaseUrl } from '../config/api.js';
import { 
  validateTicketCreate, 
  validateTicketUpdate, 
  validateResponse,
  validateFilters,
  getStatusColor,
  getPriorityColor,
  getStatusDisplayName,
  getCategoryDisplayName,
  getPriorityDisplayName
} from '../schemas/supportSchemas.js';

class SupportService {
  constructor() {
    this.baseURL = getApiBaseUrl();
  }

  // Get authentication headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Get all support tickets with optional filters
  async getTickets(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all') {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(`${this.baseURL}/support/tickets?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      throw error;
    }
  }

  // Get a specific ticket by ID
  async getTicket(ticketId) {
    try {
      const response = await fetch(`${this.baseURL}/support/tickets/${ticketId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch ticket:', error);
      throw error;
    }
  }

  // Create a new support ticket
  async createTicket(ticketData) {
    try {
      // Validate ticket data using schema
      const validation = validateTicketCreate(ticketData);
      if (!validation.success) {
        return {
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        };
      }

      const response = await fetch(`${this.baseURL}/support/tickets`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create ticket:', error);
      return {
        success: false,
        message: error.message || 'Failed to create ticket'
      };
    }
  }

  // Update a support ticket
  async updateTicket(ticketId, updateData) {
    try {
      // Validate update data using schema
      const validation = validateTicketUpdate(updateData);
      if (!validation.success) {
        return {
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        };
      }

      const response = await fetch(`${this.baseURL}/support/tickets/${ticketId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update ticket:', error);
      return {
        success: false,
        message: error.message || 'Failed to update ticket'
      };
    }
  }

  // Add a response to a ticket
  async addResponse(ticketId, message, userId = null) {
    try {
      // Validate response data using schema
      const responseData = { message, user_id: userId };
      const validation = validateResponse(responseData);
      if (!validation.success) {
        return {
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        };
      }

      const response = await fetch(`${this.baseURL}/support/tickets/${ticketId}/responses`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to add response:', error);
      return {
        success: false,
        message: error.message || 'Failed to add response'
      };
    }
  }

  // Get support analytics (admin only)
  async getAnalytics() {
    try {
      const response = await fetch(`${this.baseURL}/support/tickets/analytics`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch analytics'
      };
    }
  }

  // Update ticket status with enhanced logging
  async updateTicketStatus(ticketId, status) {
    console.log(`Updating ticket ${ticketId} status to: ${status}`);
    
    try {
      const result = await this.updateTicket(ticketId, { status });
      
      if (result.success) {
        console.log(`Successfully updated ticket ${ticketId} status to ${status}`);
      } else {
        console.error(`Failed to update ticket ${ticketId} status:`, result.message);
      }
      
      return result;
    } catch (error) {
      console.error(`Error updating ticket ${ticketId} status:`, error);
      throw error;
    }
  }

  // Bulk update ticket statuses
  async bulkUpdateStatus(ticketIds, status) {
    try {
      console.log(`Bulk updating ${ticketIds.length} tickets to status: ${status}`);
      
      const results = await Promise.allSettled(
        ticketIds.map(id => this.updateTicketStatus(id, status))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success);
      
      console.log(`Bulk update completed: ${successful.length} successful, ${failed.length} failed`);
      
      return {
        success: failed.length === 0,
        message: failed.length === 0 
          ? `Successfully updated ${successful.length} tickets`
          : `Updated ${successful.length} tickets, ${failed.length} failed`,
        successful: successful.length,
        failed: failed.length,
        details: results
      };
    } catch (error) {
      console.error('Error in bulk status update:', error);
      return {
        success: false,
        message: 'Bulk update failed',
        error: error.message
      };
    }
  }

  // Update ticket priority (admin only)
  async updateTicketPriority(ticketId, priority) {
    return this.updateTicket(ticketId, { priority });
  }

  // Assign ticket to team member (admin only)
  async assignTicket(ticketId, assignedTo) {
    return this.updateTicket(ticketId, { assigned_to: assignedTo });
  }

  // Add tags to ticket
  async updateTicketTags(ticketId, tags) {
    return this.updateTicket(ticketId, { tags });
  }

  // Get ticket statistics for dashboard
  async getTicketStats() {
    try {
      const response = await this.getTickets();
      if (response.success) {
        const tickets = response.data.tickets;
        return {
          total: tickets.length,
          open: tickets.filter(t => t.status === 'open').length,
          inProgress: tickets.filter(t => t.status === 'in_progress').length,
          resolved: tickets.filter(t => t.status === 'resolved').length,
          highPriority: tickets.filter(t => t.priority === 'high').length,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get ticket stats:', error);
      return null;
    }
  }

  // Search tickets
  async searchTickets(searchTerm, filters = {}) {
    return this.getTickets({
      ...filters,
      search: searchTerm
    });
  }

  // Get tickets by status
  async getTicketsByStatus(status) {
    return this.getTickets({ status });
  }

  // Get tickets by priority
  async getTicketsByPriority(priority) {
    return this.getTickets({ priority });
  }

  // Get tickets by category
  async getTicketsByCategory(category) {
    return this.getTickets({ category });
  }

  // Helper method to format ticket for display
  formatTicketForDisplay(ticket) {
    return {
      ...ticket,
      createdDateFormatted: ticket.created_date ? new Date(ticket.created_date).toLocaleDateString() : 'N/A',
      lastUpdatedFormatted: ticket.last_updated ? new Date(ticket.last_updated).toLocaleDateString() : 'N/A',
      statusBadgeClass: this.getStatusBadgeClass(ticket.status),
      priorityBadgeClass: this.getPriorityBadgeClass(ticket.priority),
    };
  }

  // Get CSS class for status badge
  getStatusBadgeClass(status) {
    return getStatusColor(status);
  }

  // Get CSS class for priority badge
  getPriorityBadgeClass(priority) {
    return getPriorityColor(priority);
  }

  // Get display names
  getStatusDisplayName(status) {
    return getStatusDisplayName(status);
  }

  getCategoryDisplayName(category) {
    return getCategoryDisplayName(category);
  }

  getPriorityDisplayName(priority) {
    return getPriorityDisplayName(priority);
  }

  // Validate ticket data before submission
  validateTicketData(ticketData) {
    return validateTicketCreate(ticketData);
  }
}

// Export singleton instance
export const supportService = new SupportService();
export default supportService;
