/**
 * API Configuration - Single Source of Truth
 * All API-related configuration is managed here
 */

// Production API URL - default for all production builds
const PRODUCTION_API_URL = 'https://vintagebeauty-1.onrender.com/api';

// Development API URL - only for localhost
const DEVELOPMENT_API_URL = 'http://localhost:5001/api';

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
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    // If on localhost, use development URL
    if (isLocalhost) {
      return DEVELOPMENT_API_URL;
    }
    
    // If NOT on localhost (production), use production URL
    return PRODUCTION_API_URL;
  }
  
  // Priority 3: Build-time check (fallback if window not available)
  const isDevMode = import.meta.env.DEV || import.meta.env.MODE === 'development';
  
  if (isDevMode) {
    return DEVELOPMENT_API_URL;
  }
  
  // Priority 4: Default to production (safest for production builds)
  // This ensures production builds always use production URL
  return PRODUCTION_API_URL;
};

// Get baseURL value - default to production URL
// Runtime check will override if on localhost
const baseURLValue = getApiUrl();

export const API_CONFIG = {
  // Base URL for all API requests
  baseURL: baseURLValue,
  
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
