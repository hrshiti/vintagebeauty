/**
 * API Configuration - Single Source of Truth
 * All API-related configuration is managed here
 */

// Get API URL from environment or use default
const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  
  // Runtime check: Are we on localhost? (most reliable way to detect dev vs prod)
  const isLocalhost = typeof window !== 'undefined' && 
                      (window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1');
  
  // Build-time check: Are we in development mode?
  const isDevMode = import.meta.env.DEV || import.meta.env.MODE === 'development';
  
  // Determine if we're in development (ONLY if explicitly on localhost OR in dev mode)
  const isDev = isLocalhost || isDevMode;
  
  // Log the API URL being used (for debugging)
  if (isDev) {
    console.log('🔧 API Configuration (DEV):', {
      envUrl,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
      mode: import.meta.env.MODE,
      isLocalhost,
      isDevMode,
      finalUrl: envUrl || 'https://vintagebeauty-1.onrender.com/api'
    });
  }
  
  // Priority 1: If environment variable is set, use it (highest priority)
  if (envUrl && envUrl.trim()) {
    // Ensure URL ends with /api if not already
    const cleanUrl = envUrl.trim().replace(/\/$/, ''); // Remove trailing slash
    const finalUrl = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
    
    if (!isDev) {
      console.log('✅ Using API URL from environment:', finalUrl);
    }
    return finalUrl;
  }
  
  // Priority 2: Default to PRODUCTION URL unless explicitly on localhost
  // This ensures production builds always use production URL
  if (!isLocalhost) {
    const fallbackUrl = 'https://vintagebeauty-1.onrender.com/api';
    console.log('🌐 Using production API URL:', fallbackUrl);
    if (!envUrl) {
      console.warn('⚠️ VITE_API_URL not set. Using production fallback.');
      console.warn('⚠️ Please set VITE_API_URL in Vercel environment variables for better control.');
    }
    return fallbackUrl;
  }
  
  // Priority 3: Development fallback (ONLY if on localhost)
  console.log('🏠 Using development API URL: http://localhost:5001/api');
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
