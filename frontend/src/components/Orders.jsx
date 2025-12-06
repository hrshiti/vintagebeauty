import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import orderService from '../services/orderService';
import socketService from '../services/socketService';
// Notification feature disabled
// import { useNotificationStore } from '../store/notificationStore';
import toast from 'react-hot-toast';
import BottomNavbar from './BottomNavbar';
import logo from '../assets/logo vintage.png';
import heroimg from '../assets/heroimg.png';

const Orders = () => {
  const navigate = useNavigate();
  // Notification feature disabled
  // const { addNotification } = useNotificationStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Fetch orders from backend API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await orderService.getUserOrders();
        if (response.success) {
          // Transform backend order data to match component expectations
          const transformedOrders = response.data.map(order => ({
            id: order._id,
            orderNumber: order.orderNumber || `VB${order._id.toString().slice(-8)}`,
            orderStatus: order.orderStatus || 'pending',
            paymentStatus: order.paymentStatus || 'pending',
            paymentMethod: order.paymentMethod || 'cod',
            totalPrice: order.totalPrice || 0,
            createdAt: order.createdAt,
            trackingNumber: order.trackingNumber || `TRK${order._id.toString().slice(-8).toUpperCase()}`,
            items: order.orderItems?.map(item => ({
              id: item.product?._id || item.product,
              name: item.name,
              quantity: item.quantity,
              price: item.price || item.selectedPrice,
              selectedPrice: item.selectedPrice || item.price,
              size: item.size,
              image: item.image || (item.product?.images?.[0] || null)
            })) || [],
            deliveryAddress: order.shippingAddress ? {
              address: order.shippingAddress.address,
              city: order.shippingAddress.city,
              state: order.shippingAddress.state,
              pincode: order.shippingAddress.pincode
            } : null,
            trackingHistory: order.trackingHistory || generateDefaultTrackingHistory(
              order.orderStatus, 
              order.createdAt, 
              order.paymentMethod, 
              order.paymentStatus
            )
          }));
          setOrders(transformedOrders);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        toast.error(error.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Socket.IO setup for real-time order status updates
  useEffect(() => {
    // Connect to Socket.IO
    socketService.connect();

    // Set up order status update listener
    const handleOrderStatusUpdate = (data) => {
      const { orderId, orderStatus, trackingHistory } = data;
      
      // Prepare notification data outside of setState
      const statusMessages = {
        'confirmed': 'Your order has been confirmed',
        'processing': 'Your order is being processed',
        'shipped': 'Your order has been shipped',
        'out-for-delivery': 'Your order is out for delivery',
        'delivered': 'Your order has been delivered'
      };

      const message = statusMessages[orderStatus] || `Your order status has been updated to ${orderStatus}`;
      
      // Update orders state
      setOrders(prevOrders => {
        return prevOrders.map(order => {
          if (order.id === orderId) {
            // Update order status and tracking history
            return {
              ...order,
              orderStatus: orderStatus,
              trackingHistory: trackingHistory || order.trackingHistory
            };
          }
          return order;
        });
      });

      // Update selectedOrder if it's the one being updated
      setSelectedOrder(prevSelected => {
        if (prevSelected && prevSelected.id === orderId) {
          return {
            ...prevSelected,
            orderStatus: orderStatus,
            trackingHistory: trackingHistory || prevSelected.trackingHistory
          };
        }
        return prevSelected;
      });

      // Notification feature disabled - notification not added to store
      // addNotification({
      //   type: 'order',
      //   title: 'Order Status Update',
      //   message: message,
      //   data: {
      //     orderId: orderId
      //   }
      // });

      // Show toast notification for status update
      toast.success(`Order status updated to ${orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}`, {
        icon: '📦',
        duration: 3000
      });
    };

    socketService.onOrderStatusUpdate(handleOrderStatusUpdate);

    // Join order rooms for all orders
    orders.forEach(order => {
      if (order.id) {
        socketService.joinOrderRoom(order.id);
      }
    });

    // Cleanup on unmount
    return () => {
      socketService.offOrderStatusUpdate(handleOrderStatusUpdate);
      // Leave all order rooms
      orders.forEach(order => {
        if (order.id) {
          socketService.leaveOrderRoom(order.id);
        }
      });
    };
  }, [orders]);

  // Generate default tracking history based on order status, payment method and payment status
  const generateDefaultTrackingHistory = (status, createdAt, paymentMethod = 'cod', paymentStatus = 'pending') => {
    const statusMap = {
      'pending': 0,
      'confirmed': 1,
      'processing': 2,
      'shipped': 3,
      'out-for-delivery': 4,
      'delivered': 5,
      'cancelled': -1
    };

    const statusIndex = statusMap[status?.toLowerCase()] || 0;
    
    // Determine payment description based on payment method and status
    let paymentDescription = 'Order confirmed';
    if (paymentMethod === 'cod' || paymentMethod === 'cash-on-delivery') {
      paymentDescription = 'Order confirmed. Payment will be collected on delivery';
    } else if (paymentMethod === 'online' || paymentMethod === 'card' || paymentMethod === 'upi') {
      if (paymentStatus === 'completed') {
        paymentDescription = 'Order confirmed and payment received';
      } else if (paymentStatus === 'pending') {
        paymentDescription = 'Order confirmed. Payment pending';
      } else if (paymentStatus === 'failed') {
        paymentDescription = 'Order confirmed. Payment failed';
      } else {
        paymentDescription = 'Order confirmed and payment received';
      }
    }
    
    const baseHistory = [
      { status: 'Order Placed', date: createdAt, description: 'Your order has been placed successfully', completed: true },
      { status: 'Confirmed', date: createdAt, description: paymentDescription, completed: statusIndex >= 1 },
      { status: 'Processing', date: null, description: 'Your order is being processed', completed: statusIndex >= 2 },
      { status: 'Shipped', date: null, description: 'Your order has been shipped', completed: statusIndex >= 3 },
      { status: 'Out for Delivery', date: null, description: 'Your order is out for delivery', completed: statusIndex >= 4 },
      { status: 'Delivered', date: null, description: 'Your order has been delivered', completed: statusIndex >= 5 }
    ];

    return baseHistory;
  };


  // Helper function to get safe image - uses product image from order item or heroimg as fallback
  const getSafeImage = (itemImage) => {
    if (typeof itemImage === 'string') {
      if (itemImage.includes('images vintage') || itemImage.includes('images%20vintage')) {
        return heroimg;
      }
      if (itemImage.startsWith('http') || itemImage.startsWith('/') || itemImage.startsWith('../')) {
        return itemImage;
      }
    }
    if (itemImage && typeof itemImage === 'object') {
      return itemImage;
    }
    // Use product image from order item if available
    if (itemImage) {
      return itemImage;
    }
    return heroimg;
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'confirmed': 'bg-green-500/20 text-green-400 border-green-500/30',
      'processing': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'shipped': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'out-for-delivery': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'delivered': 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30',
      'cancelled': 'bg-red-500/20 text-red-400 border-red-500/30',
      'pending': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return statusColors[status.toLowerCase()] || statusColors['pending'];
  };

  const getStatusIcon = (status) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'delivered') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (statusLower === 'shipped' || statusLower === 'out-for-delivery') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (statusLower === 'cancelled') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
        {/* Header */}
        <nav className="w-full bg-black border-b border-gray-800 sticky top-0 z-40">
          <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/account')}
                className="p-2 hover:bg-gray-900 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-2 md:gap-3">
                {logo && (
                  <img 
                    src={logo} 
                    alt="Vintage Beauty Logo" 
                    className="h-6 md:h-8 w-auto"
                  />
                )}
                <h1 className="text-base md:text-xl lg:text-2xl font-semibold uppercase tracking-wider text-white">
                  My Orders
                </h1>
              </div>

              <div className="w-10"></div>
            </div>
          </div>
        </nav>

        {/* Loading State */}
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-20 max-w-2xl">
          <div className="text-center">
            <div className="mb-6 md:mb-8">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">Loading Orders...</h2>
            <p className="text-gray-400">Please wait while we fetch your orders</p>
          </div>
        </div>

        <BottomNavbar />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
        {/* Header */}
        <nav className="w-full bg-black border-b border-gray-800 sticky top-0 z-40">
          <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/account')}
                className="p-2 hover:bg-gray-900 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-2 md:gap-3">
                {logo && (
                  <img 
                    src={logo} 
                    alt="Vintage Beauty Logo" 
                    className="h-6 md:h-8 w-auto"
                  />
                )}
                <h1 className="text-base md:text-xl lg:text-2xl font-semibold uppercase tracking-wider text-white">
                  My Orders
                </h1>
              </div>

              <div className="w-10"></div>
            </div>
          </div>
        </nav>

        {/* Empty State */}
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-20 max-w-2xl">
          <div className="text-center">
            <div className="mb-6 md:mb-8">
              <svg className="w-24 h-24 md:w-32 md:h-32 mx-auto text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">No Orders Yet</h2>
            <p className="text-gray-400 mb-6 md:mb-8">You haven't placed any orders yet. Start shopping to see your orders here!</p>
            <button
              onClick={() => navigate('/products')}
              className="bg-[#D4AF37] hover:bg-[#F4D03F] text-black font-bold px-6 md:px-8 py-3 md:py-4 rounded-lg text-sm md:text-base transition-all duration-300 shadow-lg"
            >
              Start Shopping
            </button>
          </div>
        </div>

        <BottomNavbar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20 md:pb-0">
      {/* Header */}
      <nav className="w-full bg-black border-b border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/account')}
              className="p-2 hover:bg-gray-900 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-2 md:gap-3">
              {logo && (
                <img 
                  src={logo} 
                  alt="Vintage Beauty Logo" 
                  className="h-6 md:h-8 w-auto"
                />
              )}
              <h1 className="text-base md:text-xl lg:text-2xl font-semibold uppercase tracking-wider text-white">
                My Orders ({orders.length})
              </h1>
            </div>

            <div className="w-10"></div>
          </div>
        </div>
      </nav>

      {/* Orders List */}
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-5xl">
        <div className="space-y-4 md:space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-gradient-to-br from-gray-900 to-black rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-800 hover:border-[#D4AF37]/30 transition-all duration-300 shadow-lg"
            >
              {/* Order Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-4 pb-4 border-b border-gray-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base md:text-lg font-bold text-white">
                      Order #{order.orderNumber}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${getStatusColor(order.orderStatus)}`}>
                      {getStatusIcon(order.orderStatus)}
                      {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-gray-400">
                    Placed on {formatDate(order.createdAt)}
                  </p>
                  {/* Payment Status */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      order.paymentMethod === 'cod' 
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : order.paymentStatus === 'completed'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : order.paymentStatus === 'failed'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {order.paymentMethod === 'cod' 
                        ? '💳 Cash on Delivery'
                        : order.paymentStatus === 'completed'
                        ? '✅ Payment Received'
                        : order.paymentStatus === 'pending'
                        ? '⏳ Payment Pending'
                        : order.paymentStatus === 'failed'
                        ? '❌ Payment Failed'
                        : 'Payment: ' + (order.paymentStatus || 'Pending')
                      }
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg md:text-xl font-bold text-[#D4AF37]">
                    ₹{order.totalPrice?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-3 mb-4">
                {order.items?.slice(0, 2).map((item, index) => (
                  <div key={index} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-2 md:p-3">
                    <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden bg-gray-700">
                      <img
                        src={getSafeImage(item.image || item.product?.image || item.product?.images?.[0] || heroimg)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm md:text-base font-semibold text-white truncate">
                        {item.name}
                      </h4>
                      <p className="text-xs text-gray-400">
                        Qty: {item.quantity} {item.size && `• Size: ${item.size}`}
                      </p>
                    </div>
                    <p className="text-sm md:text-base font-bold text-[#D4AF37]">
                      ₹{((item.price || item.selectedPrice || 699) * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
                {order.items?.length > 2 && (
                  <p className="text-xs text-gray-400 text-center pt-2">
                    +{order.items.length - 2} more item(s)
                  </p>
                )}
              </div>

              {/* Tracking Info */}
              <div className="bg-gray-800/30 rounded-lg p-3 md:p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="text-xs md:text-sm font-semibold text-white">Tracking Number</span>
                  </div>
                  <span className="text-xs md:text-sm font-mono text-[#D4AF37]">{order.trackingNumber}</span>
                </div>
                {order.deliveryAddress && (
                  <p className="text-xs text-gray-400">
                    Delivery to: {order.deliveryAddress.address}, {order.deliveryAddress.city}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  {selectedOrder?.id === order.id ? 'Hide Tracking' : 'View Tracking'}
                </button>
                <button
                  onClick={() => navigate(`/product/${order.items?.[0]?.id}`)}
                  className="flex-1 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] font-medium px-4 py-2.5 rounded-lg text-sm transition-all duration-300 border border-[#D4AF37]/30"
                >
                  View Details
                </button>
              </div>

              {/* Tracking Details (Expanded) */}
              {selectedOrder?.id === order.id && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <h4 className="text-sm md:text-base font-bold text-white mb-4">Order Tracking</h4>
                  <div className="space-y-4">
                    {order.trackingHistory?.map((track, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${track.completed ? 'bg-[#D4AF37]' : 'bg-gray-700'}`}></div>
                          {index < order.trackingHistory.length - 1 && (
                            <div className={`w-0.5 flex-1 ${track.completed ? 'bg-[#D4AF37]' : 'bg-gray-700'}`}></div>
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-sm font-semibold ${track.completed ? 'text-white' : 'text-gray-500'}`}>
                              {track.status}
                            </p>
                            {track.date && (
                              <p className="text-xs text-gray-400">
                                {formatDate(track.date)}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            {track.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <BottomNavbar />
    </div>
  );
};

export default Orders;

