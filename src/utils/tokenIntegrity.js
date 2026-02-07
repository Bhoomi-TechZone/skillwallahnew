// Token Integrity Protection - Prevents token loss on page refresh
export const ensureTokenPersistence = () => {
  console.log('🛡️ CHECKING TOKEN INTEGRITY ON PAGE LOAD');
  
  // Check if we have session persistent flag but missing localStorage token
  const sessionPersistent = localStorage.getItem('sessionPersistent');
  const localToken = localStorage.getItem('token');
  const sessionToken = sessionStorage.getItem('token');
  
  console.log('📊 TOKEN INTEGRITY CHECK:');
  console.log('- Session persistent flag:', sessionPersistent);
  console.log('- localStorage token exists:', !!localToken);
  console.log('- sessionStorage token exists:', !!sessionToken);
  
  // If we have session persistent flag but lost localStorage token, restore it
  if (sessionPersistent === 'true' && !localToken && sessionToken) {
    console.log('🔄 RESTORING LOST TOKEN FROM SESSION BACKUP');
    
    // Restore all authentication data
    localStorage.setItem('token', sessionToken);
    localStorage.setItem('authToken', sessionToken);
    localStorage.setItem('adminToken', sessionToken);
    
    // Restore user data
    const sessionUser = sessionStorage.getItem('user');
    const sessionRole = sessionStorage.getItem('userRole');
    const sessionAuth = sessionStorage.getItem('isAuthenticated');
    
    if (sessionUser) localStorage.setItem('user', sessionUser);
    if (sessionRole) localStorage.setItem('userRole', sessionRole);
    if (sessionAuth) localStorage.setItem('isAuthenticated', sessionAuth);
    
    console.log('✅ TOKEN RESTORATION COMPLETE');
    
    return true;
  }
  
  // If we have localStorage token, ensure sessionStorage backup exists
  if (localToken && !sessionToken) {
    console.log('💾 CREATING SESSION BACKUP FOR TOKEN');
    sessionStorage.setItem('token', localToken);
    sessionStorage.setItem('user', localStorage.getItem('user') || '{}');
    sessionStorage.setItem('userRole', localStorage.getItem('userRole') || 'super_admin');
    sessionStorage.setItem('isAuthenticated', localStorage.getItem('isAuthenticated') || 'true');
  }
  
  return false;
};

// Auto-run on module load
if (typeof window !== 'undefined') {
  // Run token integrity check when page loads
  window.addEventListener('load', ensureTokenPersistence);
  
  // Also run on focus (when user comes back to tab)
  window.addEventListener('focus', ensureTokenPersistence);
  
  // Run immediately if window is already loaded
  if (document.readyState === 'complete') {
    ensureTokenPersistence();
  }
}