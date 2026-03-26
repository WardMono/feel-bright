// Auto logout after 15 minutes of inactivity
class SessionTimeout {
  constructor(timeoutMinutes = 15) {
    this.timeout = timeoutMinutes * 60 * 1000; // Convert to milliseconds
    this.warningTime = 2 * 60 * 1000; // Show warning 2 minutes before
    this.timer = null;
    this.warningTimer = null;
    this.warningShown = false;
    this.events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Only initialize if user is logged in
    this.checkLoginStatus().then(isLoggedIn => {
      if (isLoggedIn) {
        this.init();
      }
    });
  }
  
  async checkLoginStatus() {
    try {
      const response = await fetch('/api/session');
      const data = await response.json();
      return data.loggedIn;
    } catch (error) {
      console.error('Session check failed:', error);
      return false;
    }
  }
  
  init() {
    console.log('Session timeout initialized - 15 minutes');
    
    // Set up event listeners for user activity
    this.events.forEach(event => {
      document.addEventListener(event, () => this.resetTimer(), true);
    });
    
    // Check session validity periodically
    setInterval(() => this.checkSession(), 30000); // Check every 30 seconds
    
    // Start the timer
    this.resetTimer();
  }
  
  resetTimer() {
    // Clear existing timers
    clearTimeout(this.timer);
    clearTimeout(this.warningTimer);
    this.warningShown = false;
    
    // Set warning timer (show warning 2 minutes before logout)
    this.warningTimer = setTimeout(() => this.showWarning(), this.timeout - this.warningTime);
    
    // Set logout timer
    this.timer = setTimeout(() => this.logout(), this.timeout);
  }
  
  showWarning() {
    if (this.warningShown) return;
    
    this.warningShown = true;
    const continueSession = confirm(
      'Your session will expire in 2 minutes due to inactivity.\n\n' +
      'Click OK to stay logged in, or Cancel to log out now.'
    );
    
    if (continueSession) {
      // Keep session alive by making a request
      fetch('/api/session').then(() => {
        this.resetTimer();
      });
    } else {
      this.logout();
    }
  }
  
  async checkSession() {
    try {
      const response = await fetch('/api/session/check');
      const data = await response.json();
      
      // Force logout if account is archived or session is invalid
      if (data.forceLogout) {
        alert(data.message || 'Your session has expired. Please log in again.');
        this.logout();
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
  }
  
  async logout() {
    console.log('Session expired due to inactivity');
    
    try {
      // Call logout endpoint
      await fetch('/logout', { method: 'GET' });
      
      // Clear any client-side storage
      sessionStorage.clear();
      localStorage.removeItem('userLoggedIn');
      
      // Redirect to login page
      window.location.href = '/index.html';
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout request fails
      window.location.href = '/index.html';
    }
  }
  
  destroy() {
    // Clean up event listeners if needed
    clearTimeout(this.timer);
    clearTimeout(this.warningTimer);
    this.events.forEach(event => {
      document.removeEventListener(event, () => this.resetTimer(), true);
    });
  }
}

// Initialize the auto-logout for logged-in pages only
const excludedPages = ['/login.html', '/signup.html', '/index.html', '/forgot.html', '/new-pass.html'];
const currentPath = window.location.pathname;
const isExcluded = excludedPages.some(page => currentPath.includes(page));

if (!isExcluded) {
  // Initialize session timeout
  window.sessionTimeout = new SessionTimeout(15);
  
  // Log for debugging
  console.log('Session timeout active: 15 minutes');
}