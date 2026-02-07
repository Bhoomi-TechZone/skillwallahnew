// Ticket Update Service for real-time notifications
// This service handles broadcasting ticket status updates to all relevant components

class TicketUpdateService {
  constructor() {
    this.subscribers = new Map();
    this.updateQueue = [];
    this.isProcessing = false;
  }

  // Subscribe to ticket updates
  subscribe(component, callback) {
    if (!this.subscribers.has(component)) {
      this.subscribers.set(component, []);
    }
    this.subscribers.get(component).push(callback);
    
    console.log(`Component ${component} subscribed to ticket updates`);
    return () => this.unsubscribe(component, callback);
  }

  // Unsubscribe from ticket updates
  unsubscribe(component, callback) {
    const callbacks = this.subscribers.get(component);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.subscribers.delete(component);
      }
    }
    console.log(`Component ${component} unsubscribed from ticket updates`);
  }

  // Notify all subscribers about ticket update
  notifyUpdate(ticketUpdate) {
    console.log('Broadcasting ticket update:', ticketUpdate);
    
    this.updateQueue.push({
      ...ticketUpdate,
      timestamp: new Date().toISOString()
    });

    if (!this.isProcessing) {
      this.processUpdateQueue();
    }
  }

  // Process queued updates
  async processUpdateQueue() {
    if (this.isProcessing || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.updateQueue.length > 0) {
        const update = this.updateQueue.shift();
        
        // Broadcast to all subscribers
        for (const [component, callbacks] of this.subscribers.entries()) {
          try {
            callbacks.forEach(callback => {
              if (typeof callback === 'function') {
                callback(update);
              }
            });
          } catch (error) {
            console.error(`Error notifying component ${component}:`, error);
          }
        }

        // Small delay to prevent overwhelming the UI
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error processing update queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Notify status change
  notifyStatusChange(ticketId, oldStatus, newStatus, updatedBy = 'Admin') {
    this.notifyUpdate({
      type: 'STATUS_CHANGE',
      ticketId,
      oldStatus,
      newStatus,
      updatedBy,
      message: `Ticket status changed from ${oldStatus} to ${newStatus}`
    });
  }

  // Notify ticket creation
  notifyTicketCreated(ticket, createdBy) {
    this.notifyUpdate({
      type: 'TICKET_CREATED',
      ticket,
      createdBy,
      message: `New ticket created: ${ticket.subject}`
    });
  }

  // Notify response added
  notifyResponseAdded(ticketId, response, addedBy) {
    this.notifyUpdate({
      type: 'RESPONSE_ADDED',
      ticketId,
      response,
      addedBy,
      message: `New response added to ticket ${ticketId}`
    });
  }

  // Notify ticket assignment
  notifyTicketAssigned(ticketId, assignedTo, assignedBy = 'Admin') {
    this.notifyUpdate({
      type: 'TICKET_ASSIGNED',
      ticketId,
      assignedTo,
      assignedBy,
      message: `Ticket ${ticketId} assigned to ${assignedTo}`
    });
  }

  // Notify priority change
  notifyPriorityChange(ticketId, oldPriority, newPriority, updatedBy = 'Admin') {
    this.notifyUpdate({
      type: 'PRIORITY_CHANGE',
      ticketId,
      oldPriority,
      newPriority,
      updatedBy,
      message: `Ticket priority changed from ${oldPriority} to ${newPriority}`
    });
  }

  // Get current subscriber count
  getSubscriberCount() {
    let totalCallbacks = 0;
    for (const callbacks of this.subscribers.values()) {
      totalCallbacks += callbacks.length;
    }
    return {
      components: this.subscribers.size,
      totalCallbacks
    };
  }

  // Clear all subscribers (useful for cleanup)
  clearAllSubscribers() {
    console.log('Clearing all ticket update subscribers');
    this.subscribers.clear();
    this.updateQueue.length = 0;
    this.isProcessing = false;
  }

  // For debugging: log current state
  getDebugInfo() {
    return {
      subscriberCount: this.getSubscriberCount(),
      queueLength: this.updateQueue.length,
      isProcessing: this.isProcessing,
      subscribers: Array.from(this.subscribers.keys())
    };
  }
}

// Export singleton instance
export const ticketUpdateService = new TicketUpdateService();
export default ticketUpdateService;
