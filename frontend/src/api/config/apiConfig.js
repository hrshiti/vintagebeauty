/**
 * API Configuration - Single Source of Truth
 * All API-related configuration is managed here
 */

// Get API URL from environment or use default
const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  
  // Log the API URL being used (for debugging)
  if (import.meta.env.DEV) {
    console.log('🔧 API Configuration:', {
      envUrl,
      isDev: import.meta.env.DEV,
      finalUrl: envUrl || 'http://localhost:5001/api'
    });
  }
  
  if (envUrl) {
    // Ensure URL ends with /api if not already
    const cleanUrl = envUrl.trim().replace(/\/$/, ''); // Remove trailing slash
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }
  
  // In production, warn if URL is not set
  if (!import.meta.env.DEV) {
    console.error('❌ CRITICAL: VITE_API_URL is not set in Vercel environment variables!');
    console.error('❌ This will cause all API calls to fail with timeout errors.');
    console.error('❌ Please set VITE_API_URL in Vercel: https://vintagebeauty-1.onrender.com/api');
    // Use the Render URL as fallback in production if env var not set
    // This allows the app to work even if env var is missing (though it should be set)
    return 'https://vintagebeauty-1.onrender.com/api';
  }
  
  return 'http://localhost:5001/api';
};

export const API_CONFIG = {
  // Base URL for all API requests
  baseURL: getApiUrl(),
  
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
