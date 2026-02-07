// Utility functions for handling profile image uploads

export const validateImageFile = (file) => {
  const errors = [];
  
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
  }
  
  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    errors.push('Image size should be less than 5MB');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const createImagePreview = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
};

export const uploadProfileImage = async (file, token, apiBaseUrl) => {
  const formData = new FormData();
  formData.append('avatar', file);
  
  const response = await fetch(`${apiBaseUrl}/profile/upload-avatar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(errorData.detail || 'Failed to upload image');
  }
  
  return response.json();
};

export const getProfileImageUrl = (avatarUrl, apiBaseUrl) => {
  if (!avatarUrl) return null;
  
  // If it's already a full URL, return as is
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // If it's a relative path, prepend the API base URL
  if (avatarUrl.startsWith('/uploads/')) {
    return `${apiBaseUrl}${avatarUrl}`;
  }
  
  return avatarUrl;
};
