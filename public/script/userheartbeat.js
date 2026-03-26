// userHeartbeat.js - Add this script to your user-facing pages
// Include this in any page where users spend time after login

class UserHeartbeat {
  constructor() {
    this.heartbeatInterval = null;
    this.isActive = true;
    this.lastActivity = Date.now();
    this.intervalDuration = 30000; // 30 seconds
    this.inactivityThreshold = 5 * 60 * 1000; // 5 minutes
    
    this.init();
  }

  init() {
    // Start heartbeat only if user is logged in
    if (this.isUserLoggedIn()) {
      this.startHeartbeat();
      this.setupActivityListeners();
      this.setupVisibilityListener();
      console.log('User heartbeat initialized');
    }
  }

  isUserLoggedIn() {
    // Check if user session exists - modify this based on your auth system
    // You can check for session cookies, localStorage, or DOM elements that indicate login
    return document.cookie.includes('connect.sid') || // Express session cookie
           sessionStorage.getItem('user_id') ||
           localStorage.getItem('user_logged_in') ||
           document.querySelector('[data-user-id]'); // Or any element that shows user is logged in
  }

  startHeartbeat() {
    console.log('Starting user heartbeat tracking...');
    
    // Send initial heartbeat
    this.sendHeartbeat();
    
    // Set up interval for regular heartbeats
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      // Only send heartbeat if user has been active recently
      if (now - this.lastActivity <= this.inactivityThreshold) {
        this.sendHeartbeat();
      } else {
        console.log('User inactive, skipping heartbeat');
      }
    }, this.intervalDuration);
  }

  async sendHeartbeat() {
    try {
      const response = await fetch('/api/user/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Important for session cookies
      });

      if (response.ok) {
        const data = await response.json();
        // console.log('Heartbeat sent:', new Date(data.timestamp));
      } else {
        console.error('Heartbeat failed:', response.status);
        
        // If unauthorized, user might be logged out
        if (response.status === 401) {
          console.log('User session expired, stopping heartbeat');
          this.stopHeartbeat();
        }
      }
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  }

  setupActivityListeners() {
    const events = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'click', 'focus', 'blur'
    ];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.updateActivity();
      }, true);
    });
  }

  setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, user might have switched tabs
        console.log('Page hidden');
        this.isActive = false;
      } else {
        // Page is visible again, resume normal activity tracking
        console.log('Page visible');
        this.updateActivity();
        this.sendHeartbeat(); // Send immediate heartbeat when page becomes visible
      }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.stopHeartbeat();
    });
  }

  updateActivity() {
    this.lastActivity = Date.now();
    this.isActive = true;
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('User heartbeat stopped');
    }
  }

  // Public method to manually restart heartbeat if needed
  restart() {
    this.stopHeartbeat();
    this.init();
  }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if not already exists
  if (!window.userHeartbeat) {
    window.userHeartbeat = new UserHeartbeat();
  }
});

// Make it available globally for manual control
window.UserHeartbeat = UserHeartbeat;

// Initialize heartbeat for pages that load this script
window.initUserHeartbeat = () => {
  if (window.userHeartbeat) {
    window.userHeartbeat.stopHeartbeat();
  }
  window.userHeartbeat = new UserHeartbeat();
};

// For SPA (Single Page Applications) - call this when user logs in
window.startUserTracking = () => {
  window.initUserHeartbeat();
};

// For when user logs out - call this to stop tracking
window.stopUserTracking = () => {
  if (window.userHeartbeat) {
    window.userHeartbeat.stopHeartbeat();
    window.userHeartbeat = null;
  }
};