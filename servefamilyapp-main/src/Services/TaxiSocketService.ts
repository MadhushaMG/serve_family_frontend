import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { getAccessToken } from '../utils/tokenManager';
import { useActiveBookingStore } from '../store/useActiveBookingStore';
import { useIncomingBookingStore, IncomingBookingData } from '../store/useIncomingBookingStore';

export const LOCATION_SOCKET_URL = 'https://test.servefamily.com';

let socket: Socket | null = null;

// Helper to join all required driver & user rooms on backend
const joinDriverRooms = (targetSocket: Socket, driverId?: string) => {
  const currentUserId = driverId || useAuthStore.getState().user?.id;
  if (!currentUserId || !targetSocket.connected) return;

  const idStr = String(currentUserId);
  console.log(`🚕 [Root Socket] Registering Driver & User rooms for: ${idStr}`);
  targetSocket.emit('join_driver', idStr);
  targetSocket.emit('join_user', idStr);
  targetSocket.emit('driver_online', { driverId: idStr });
};

/**
 * Initialize real-time Socket.io connection at the App Root
 * This socket runs continuously across all screens/routes/tabs so that
 * location and ride data pass uninterrupted for both driver and passenger.
 */
export const initTaxiSocket = (tokenOverride?: string, driverIdOverride?: string): Socket => {
  const token = tokenOverride || useAuthStore.getState().accessToken || '';
  const user = useAuthStore.getState().user;
  const driverId = driverIdOverride || user?.id || '';

  if (socket && socket.connected) {
    if (driverId) {
      joinDriverRooms(socket, driverId);
    }
    return socket;
  }

  if (socket && !socket.connected) {
    if (driverId) {
      socket.auth = {
        token: token || undefined,
        userId: driverId,
        driverId: driverId,
        id: driverId,
      };
    }
    socket.connect();
    return socket;
  }

  socket = io(LOCATION_SOCKET_URL, {
    auth: {
      token: token || undefined,
      userId: driverId || undefined,
      driverId: driverId || undefined,
      id: driverId || undefined,
    },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('⚡ [Root Socket] Connected to Taxi Socket server. ID:', socket?.id);
    const currentUser = useAuthStore.getState().user;
    const currentId = driverIdOverride || currentUser?.id || driverId;
    if (currentId && socket) {
      joinDriverRooms(socket, currentId);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 [Root Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.warn('⚠️ [Root Socket] Connection error:', error?.message);
  });

  // ── Global Passenger Listener: Live Driver Location Tracking ──
  socket.on('driver_location_update', (data: any) => {
    if (data && data.latitude && data.longitude) {
      useActiveBookingStore.getState().updateDriverLocation(
        Number(data.latitude),
        Number(data.longitude)
      );
    }
  });

  // ── Global Driver Listener: Real-time Ride Broadcasts across ALL tabs ──
  const handleIncomingRide = (ride: any) => {
    if (ride && (ride.id || ride.bookingId)) {
      console.log('🚨 [Root Socket] Received Ride Request:', ride.id || ride.bookingId);
      const incomingData: IncomingBookingData = {
        bookingId: String(ride.id || ride.bookingId),
        customerName: ride.customerName || ride.user?.name || "Customer Ride Request",
        customerPhone: ride.customerPhone || ride.user?.phone || "",
        pickupLocation: ride.pickupAddress || "Pickup Location",
        dropoffLocation: ride.dropAddress || "Destination",
        pickupLat: ride.pickupLat,
        pickupLng: ride.pickupLng,
        dropoffLat: ride.dropLat,
        dropoffLng: ride.dropLng,
        fare: ride.fare || "0.00",
        distance: ride.distance ? `${ride.distance} km` : "0 km",
        paymentMethod: ride.paymentMethod || "Cash",
        vehicleType: ride.vehicleType || "Taxi",
      };
      useIncomingBookingStore.getState().triggerIncomingBooking(incomingData);
    }
  };

  socket.on('new_ride_request', handleIncomingRide);
  socket.on('ride_request_received', handleIncomingRide);

  // Auto-dismiss modal if another driver accepts or passenger cancels
  socket.on('ride_request_cancelled', (data: any) => {
    const cur = useIncomingBookingStore.getState().bookingData;
    if (cur && (cur.bookingId === String(data?.bookingId) || cur.bookingId === String(data?.id))) {
      useIncomingBookingStore.getState().rejectBooking();
    }
  });

  socket.on('ride_request_taken', (data: any) => {
    const cur = useIncomingBookingStore.getState().bookingData;
    if (cur && (cur.bookingId === String(data?.bookingId) || cur.bookingId === String(data?.id))) {
      useIncomingBookingStore.getState().rejectBooking();
    }
  });

  socket.on('ride_cancelled', (data: any) => {
    const cur = useIncomingBookingStore.getState().bookingData;
    if (cur && (cur.bookingId === String(data?.bookingId) || cur.bookingId === String(data?.id))) {
      useIncomingBookingStore.getState().rejectBooking();
    }
  });

  return socket;
};

// ── Auto-sync with AuthStore: Immediately join rooms when user logs in / rehydrates ──
useAuthStore.subscribe((state) => {
  const currentUserId = state.user?.id;
  const currentToken = state.accessToken;

  if (currentUserId && socket) {
    if (socket.connected) {
      joinDriverRooms(socket, currentUserId);
    } else {
      socket.auth = {
        token: currentToken || undefined,
        userId: currentUserId,
        driverId: currentUserId,
        id: currentUserId,
      };
      socket.connect();
    }
  }
});

export const getTaxiSocket = (): Socket => {
  if (!socket) {
    return initTaxiSocket();
  }
  return socket;
};

/**
 * Emit driver's live GPS location to server so passenger can track in real-time
 */
export const emitDriverLocation = (latitude: number, longitude: number, bookingId?: string) => {
  if (socket && socket.connected) {
    socket.emit('driver_location_update', { latitude, longitude, bookingId });
    socket.emit('update_location', { latitude, longitude, bookingId });
    socket.emit('driver_location', { latitude, longitude, bookingId });
  }
};

/**
 * Join driver-specific room
 */
export const emitJoinDriver = (driverId: string) => {
  if (socket && socket.connected && driverId) {
    joinDriverRooms(socket, driverId);
  }
};

/**
 * Disconnect socket on explicit user logout
 */
export const disconnectTaxiSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
