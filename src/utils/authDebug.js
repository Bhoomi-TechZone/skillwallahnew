/**
 * Authentication debugging utilities
 */

export const debugAuthState = () => {
  console.log('=== AUTHENTICATION DEBUG ===');
  console.log('token:', localStorage.getItem('token'));
  console.log('instructorToken:', localStorage.getItem('instructorToken'));
  console.log('adminToken:', localStorage.getItem('adminToken'));
  console.log('authToken:', localStorage.getItem('authToken'));
  console.log('user:', localStorage.getItem('user'));
  console.log('refresh_token:', localStorage.getItem('refresh_token'));
  
  const token = localStorage.getItem('token');
  if (token) {
    try {
      // Decode JWT to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload:', payload);
      console.log('Token expires:', new Date(payload.exp * 1000));
      console.log('Token expired:', payload.exp * 1000 < Date.now());
    } catch (e) {
      console.log('Could not decode token');
    }
  }
  console.log('========================');
};

export const checkTokenValidity = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch (e) {
    return false;
  }
};

export const getValidToken = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  if (checkTokenValidity()) {
    return token;
  } else {
    console.warn('Token has expired');
    return null;
  }
};
