import { io } from 'socket.io-client';
import { API_CONFIG } from '../api/config/apiConfig';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Extract base URL without /api suffix for Socket.IO (Socket.IO connects to server root)
    const baseURL = API_CONFIG.baseURL.replace('/api', '');
    const backendUrl = baseURL || 'https://vintagebeauty-1.onrender.com';
    
    // Don't attempt connection if backend URL is localhost in production
    if (backendUrl.includes('localhost') && !import.meta.env.DEV) {
      console.warn('⚠️ Socket.IO: Backend URL not configured. Skipping Socket.IO connection.');
      console.warn('⚠️ Please set VITE_API_URL in Vercel environment variables (e.g., https://vintagebeauty-1.onrender.com/api)');
      return null;
    }
    
    // Log connection attempt only in development
    if (import.meta.env.DEV) {
      console.log('Socket.IO connecting to:', backendUrl);
    }
    
    // Get authentication token from localStorage
    const token = localStorage.getItem('token');
    
    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10, // Increased retry attempts
      reconnectionDelayMax: 10000, // Max delay between retries
      timeout: 20000, // Connection timeout (20 seconds)
      forceNew: false,
      upgrade: true,
      rememberUpgrade: true,
      auth: {
        token: token || null
      },
      query: {
        token: token || null
      },
      // Add extra options for better connection handling
      autoConnect: true,
      // Increase ping timeout for slow connections
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Socket.IO connected:', this.socket.id);
      
      // Re-authenticate if token is available
      if (token) {
        this.socket.emit('authenticate', { token });
      }
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Socket.IO disconnected');
    });

    this.socket.on('connect_error', (error) => {
      // Only log errors in development or if it's not a timeout
      if (import.meta.env.DEV || (!error.message?.includes('timeout') && !error.message?.includes('xhr poll error'))) {
        console.error('Socket.IO connection error:', error);
      } else {
        // In production, silently handle timeout errors - Socket.IO will retry automatically
        console.warn('Socket.IO connection timeout - retrying...');
      }
      this.isConnected = false;
    });

    // Listen for authentication errors (but don't log non-critical errors)
    this.socket.on('error', (error) => {
      // Only log errors that are not about missing orders (these are normal during order creation)
      if (error.message && 
          !error.message.includes('Not authorized to access this order') &&
          !error.message.includes('Order not found')) {
        console.error('Socket.IO error:', error);
      }
      // Silently ignore order-related errors as they're expected during order creation
    });

    return this.socket;
  }

  // Reconnect with new token (call this after login)
  reconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
    return this.connect();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('Socket.IO disconnected manually');
    }
  }

  joinOrderRoom(orderId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-order-room', orderId);
      console.log(`Joined order room: order-${orderId}`);
    }
  }

  leaveOrderRoom(orderId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave-order-room', orderId);
      console.log(`Left order room: order-${orderId}`);
    }
  }

  onOrderStatusUpdate(callback) {
    if (this.socket) {
      this.socket.on('order-status-updated', callback);
    }
  }

  offOrderStatusUpdate(callback) {
    if (this.socket) {
      this.socket.off('order-status-updated', callback);
    }
  }

  onNewAnnouncement(callback) {
    if (this.socket) {
      this.socket.on('new-announcement', callback);
    }
  }

  offNewAnnouncement(callback) {
    if (this.socket) {
      this.socket.off('new-announcement', callback);
    }
  }

  onNewCoupon(callback) {
    if (this.socket) {
      this.socket.on('new-coupon', callback);
    }
  }

  offNewCoupon(callback) {
    if (this.socket) {
      this.socket.off('new-coupon', callback);
    }
  }

  getSocket() {
    return this.socket;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;

