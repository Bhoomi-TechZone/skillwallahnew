// Frontend support schemas for data validation
// Using vanilla JavaScript validation instead of zod to avoid dependencies

// Enums
export const TicketStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  PENDING: 'pending',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

export const TicketPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

export const TicketCategory = {
  TECHNICAL: 'technical',
  BILLING: 'billing',
  COURSE_MANAGEMENT: 'course_management',
  CERTIFICATES: 'certificates',
  GENERAL: 'general'
};

// Default form values
export const defaultTicketForm = {
  subject: '',
  description: '',
  category: '',
  priority: TicketPriority.MEDIUM,
  tags: []
};

export const defaultFilters = {
  status: 'all',
  priority: 'all',
  category: 'all',
  search: ''
};

// Helper functions
export const getStatusColor = (status) => {
  const colors = {
    [TicketStatus.OPEN]: 'bg-[#988913]/10 text-[#988913]',
    [TicketStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700',
    [TicketStatus.PENDING]: 'bg-yellow-100 text-yellow-700',
    [TicketStatus.RESOLVED]: 'bg-orange-100 text-orange-700',
    [TicketStatus.CLOSED]: 'bg-gray-100 text-gray-700'
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export const getPriorityColor = (priority) => {
  const colors = {
    [TicketPriority.HIGH]: 'bg-red-100 text-red-700',
    [TicketPriority.MEDIUM]: 'bg-yellow-100 text-yellow-700',
    [TicketPriority.LOW]: 'bg-orange-100 text-orange-700'
  };
  return colors[priority] || 'bg-gray-100 text-gray-700';
};

export const getStatusDisplayName = (status) => {
  const names = {
    [TicketStatus.OPEN]: 'Open',
    [TicketStatus.IN_PROGRESS]: 'In Progress',
    [TicketStatus.PENDING]: 'Pending',
    [TicketStatus.RESOLVED]: 'Resolved',
    [TicketStatus.CLOSED]: 'Closed'
  };
  return names[status] || status;
};

export const getCategoryDisplayName = (category) => {
  const names = {
    [TicketCategory.TECHNICAL]: 'Technical',
    [TicketCategory.BILLING]: 'Billing',
    [TicketCategory.COURSE_MANAGEMENT]: 'Course Management',
    [TicketCategory.CERTIFICATES]: 'Certificates',
    [TicketCategory.GENERAL]: 'General'
  };
  return names[category] || category;
};

export const getPriorityDisplayName = (priority) => {
  const names = {
    [TicketPriority.HIGH]: 'High',
    [TicketPriority.MEDIUM]: 'Medium',
    [TicketPriority.LOW]: 'Low'
  };
  return names[priority] || priority;
};

// Validation functions (without zod)
export const validateTicketCreate = (data) => {
  const errors = [];

  // Validate subject
  if (!data.subject || typeof data.subject !== 'string') {
    errors.push('Subject is required');
  } else if (data.subject.length < 3) {
    errors.push('Subject must be at least 3 characters long');
  } else if (data.subject.length > 200) {
    errors.push('Subject must be less than 200 characters');
  }

  // Validate description
  if (!data.description || typeof data.description !== 'string') {
    errors.push('Description is required');
  } else if (data.description.length < 10) {
    errors.push('Description must be at least 10 characters long');
  } else if (data.description.length > 2000) {
    errors.push('Description must be less than 2000 characters');
  }

  // Validate category
  if (!data.category) {
    errors.push('Category is required');
  } else if (!Object.values(TicketCategory).includes(data.category)) {
    errors.push('Invalid category');
  }

  // Validate priority
  if (data.priority && !Object.values(TicketPriority).includes(data.priority)) {
    errors.push('Invalid priority');
  }

  // Set defaults
  const validatedData = {
    ...data,
    priority: data.priority || TicketPriority.MEDIUM,
    tags: Array.isArray(data.tags) ? data.tags : [],
    attachment_count: typeof data.attachment_count === 'number' ? data.attachment_count : 0
  };

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? validatedData : null,
    errors
  };
};

export const validateTicketUpdate = (data) => {
  const errors = [];

  // Validate subject if provided
  if (data.subject !== undefined) {
    if (typeof data.subject !== 'string') {
      errors.push('Subject must be a string');
    } else if (data.subject.length < 3) {
      errors.push('Subject must be at least 3 characters long');
    } else if (data.subject.length > 200) {
      errors.push('Subject must be less than 200 characters');
    }
  }

  // Validate description if provided
  if (data.description !== undefined) {
    if (typeof data.description !== 'string') {
      errors.push('Description must be a string');
    } else if (data.description.length < 10) {
      errors.push('Description must be at least 10 characters long');
    } else if (data.description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }
  }

  // Validate status if provided
  if (data.status !== undefined && !Object.values(TicketStatus).includes(data.status)) {
    errors.push('Invalid status');
  }

  // Validate priority if provided
  if (data.priority !== undefined && !Object.values(TicketPriority).includes(data.priority)) {
    errors.push('Invalid priority');
  }

  // Validate category if provided
  if (data.category !== undefined && !Object.values(TicketCategory).includes(data.category)) {
    errors.push('Invalid category');
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : null,
    errors
  };
};

export const validateResponse = (data) => {
  const errors = [];

  // Validate message
  if (!data.message || typeof data.message !== 'string') {
    errors.push('Message is required');
  } else if (data.message.length < 1) {
    errors.push('Message cannot be empty');
  } else if (data.message.length > 1000) {
    errors.push('Message must be less than 1000 characters');
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : null,
    errors
  };
};

export const validateFilters = (data) => {
  // Filters are optional, so just return success with the data
  return {
    success: true,
    data: data || {},
    errors: []
  };
};