/**
 * API Configuration - Single Source of Truth
 * All API-related configuration is managed here
 */

// Get API URL from environment or use default
const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  
  // Priority 1: If environment variable is set, use it (highest priority)
  if (envUrl && envUrl.trim()) {
    const cleanUrl = envUrl.trim().replace(/\/$/, ''); // Remove trailing slash
    const finalUrl = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
    return finalUrl;
  }
  
  // Priority 2: Runtime check - Are we on localhost?
  // This is the most reliable way to detect dev vs prod at runtime
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    // If NOT on localhost, use production URL
    if (!isLocalhost) {
      const fallbackUrl = 'https://vintagebeauty-1.onrender.com/api';
      console.log('🌐 Using production API URL:', fallbackUrl);
      return fallbackUrl;
    }
    
    // If on localhost, use development URL
    console.log('🏠 Using development API URL: http://localhost:5001/api');
    return 'http://localhost:5001/api';
  }
  
  // Priority 3: Build-time check (fallback if window not available)
  const isDevMode = import.meta.env.DEV || import.meta.env.MODE === 'development';
  
  if (isDevMode) {
    return 'http://localhost:5001/api';
  }
  
  // Priority 4: Default to production (safest for production builds)
  return 'https://vintagebeauty-1.onrender.com/api';
};

export const API_CONFIG = {
  // Base URL for all API requests - use getter to ensure runtime check
  get baseURL() {
    return getApiUrl();
  },
  
  // Request timeout in milliseconds (increased for slow connections)
  timeout: 60000, // 60 seconds
  
  // Default headers
  headers: {
    'Content-Type': 'application/json',
  },
  
  // Axios configuration
  withCredentials: true,
  
  // Public endpoints that don't require authentication
  publicEndpoints: [
    '/users/login',
    '/users/register',
    '/users/send-otp',
    '/users/verify-otp',
    '/auth/send-otp',
    '/auth/verify-otp',
    '/admin/login',
    '/admin/register',
    '/hero-carousel',
    '/combo-deals',
  ],
  
  // Enable API logging in development
  enableLogging: import.meta.env.DEV,
  
  // Recent login grace period (ms) - don't logout on 401 if login was recent
  recentLoginGracePeriod: 10000, // 10 seconds
};

export default API_CONFIG;
