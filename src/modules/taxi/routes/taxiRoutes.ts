import { Router } from "express";
import { requireAuth, optionalAuth } from "../../../middleware/auth";

import { 
  getVehicleTypes, 
  registerVehicle, 
  acceptBooking, 
  cancelBooking,
  updateBookingStatus, 
  getActiveVehicles, 
  updateDriverRate, 
  updateDriverWaiting,
  getAvailableRides,
  bookRide,
  acceptBookingWithBid,
  getBookingDetails,
  getBookingReceipt,
  getDriverBookings,
  getPassengerBookings,
  updateDriverLocation,
  estimateRideFare,
  rateBooking,
  getDriverEarningsSummary,
  driverHeartbeat,
  getDriverStatus,
  toggleDriverOnlineStatus,
  emailBookingReceipt
} from "../controllers/taxiController";
const router = Router();

// GET & POST /api/taxi/estimate or /estimate-fare - Calculate road distance & fare estimates
router.get("/estimate", optionalAuth, estimateRideFare);
router.post("/estimate", optionalAuth, estimateRideFare);
router.get("/estimate-fare", optionalAuth, estimateRideFare);
router.post("/estimate-fare", optionalAuth, estimateRideFare);

router.post("/booking", requireAuth, bookRide);
router.post("/bookings", requireAuth, bookRide);
router.post("/book", requireAuth, bookRide);
router.post("/ride", requireAuth, bookRide);
router.post("/rides", requireAuth, bookRide);

router.get("/booking/:bookingId/receipt", requireAuth, getBookingReceipt);
router.get("/booking/:bookingId/bill", requireAuth, getBookingReceipt);
router.get("/bookings/:bookingId/receipt", requireAuth, getBookingReceipt);
router.get("/bookings/:bookingId/bill", requireAuth, getBookingReceipt);
router.get("/receipt/:bookingId", requireAuth, getBookingReceipt);
router.get("/receipts/:bookingId", requireAuth, getBookingReceipt);
router.get("/bill/:bookingId", requireAuth, getBookingReceipt);
router.get("/invoice/:bookingId", requireAuth, getBookingReceipt);

// POST /api/taxi/booking/:bookingId/send-receipt & email-receipt
router.post("/booking/:bookingId/send-receipt", requireAuth, emailBookingReceipt);
router.post("/booking/:bookingId/email-receipt", requireAuth, emailBookingReceipt);
router.post("/bookings/:bookingId/send-receipt", requireAuth, emailBookingReceipt);
router.post("/bookings/:bookingId/email-receipt", requireAuth, emailBookingReceipt);

router.get("/booking/:bookingId", requireAuth, getBookingDetails);
router.get("/bookings/:bookingId", requireAuth, getBookingDetails);

router.patch("/booking/:bookingId/accept", requireAuth, acceptBooking);
router.patch("/booking/:bookingId/accept-bid", requireAuth, acceptBookingWithBid);
router.patch("/booking/:bookingId/status", requireAuth, updateBookingStatus);
router.patch("/bookings/:bookingId/status", requireAuth, updateBookingStatus);

router.patch("/booking/:bookingId/cancel", requireAuth, cancelBooking);
router.post("/booking/:bookingId/cancel", requireAuth, cancelBooking);
router.delete("/booking/:bookingId/cancel", requireAuth, cancelBooking);
router.delete("/booking/:bookingId", requireAuth, cancelBooking);
router.patch("/bookings/:bookingId/cancel", requireAuth, cancelBooking);
router.post("/bookings/:bookingId/cancel", requireAuth, cancelBooking);
router.delete("/bookings/:bookingId/cancel", requireAuth, cancelBooking);
router.delete("/bookings/:bookingId", requireAuth, cancelBooking);
router.post("/booking/:bookingId/review", requireAuth, rateBooking);
router.post("/booking/:bookingId/rate", requireAuth, rateBooking);
router.get("/active-vehicles", optionalAuth, getActiveVehicles);

// GET /api/taxi/driver/bookings & history - Get all incoming/assigned bookings for logged in driver
router.get("/driver/bookings", requireAuth, getDriverBookings);
router.get("/driver/history", requireAuth, getDriverBookings);
router.get("/driver/trips", requireAuth, getDriverBookings);
router.get("/driver/rides", requireAuth, getDriverBookings);
router.get("/driver/completed-rides", requireAuth, getDriverBookings);

// GET /api/taxi/driver/earnings & /api/taxi/driver/wallet - Dedicated earnings and wallet metrics
router.get("/driver/earnings", requireAuth, getDriverEarningsSummary);
router.get("/driver/wallet", requireAuth, getDriverEarningsSummary);
router.get("/driver/wallets", requireAuth, getDriverEarningsSummary);
router.get("/driver/income", requireAuth, getDriverEarningsSummary);

// GET /api/taxi/my-bookings & history - Get passenger's booking history
router.get("/my-bookings", requireAuth, getPassengerBookings);
router.get("/my-rides", requireAuth, getPassengerBookings);
router.get("/my-trips", requireAuth, getPassengerBookings);
router.get("/passenger/bookings", requireAuth, getPassengerBookings);
router.get("/passenger/history", requireAuth, getPassengerBookings);
router.get("/passenger/rides", requireAuth, getPassengerBookings);
router.get("/passenger/trips", requireAuth, getPassengerBookings);
router.get("/ride-history", requireAuth, getPassengerBookings);
router.get("/trip-history", requireAuth, getPassengerBookings);
router.get("/history", requireAuth, getPassengerBookings);
router.get("/bookings", requireAuth, getPassengerBookings);

// GET /api/taxi/vehicle-types
router.get("/vehicle-types", getVehicleTypes);


// POST /api/taxi/register
router.post("/register", requireAuth, registerVehicle);


router.patch("/update-rate", requireAuth, updateDriverRate);
router.patch("/update-settings", requireAuth, updateDriverRate);

// Dedicated Waiting API endpoints for driver
router.patch("/waiting", requireAuth, updateDriverWaiting);
router.patch("/update-waiting", requireAuth, updateDriverWaiting);
router.patch("/toggle-waiting", requireAuth, updateDriverWaiting);

// Dedicated Driver Location update endpoints
router.patch("/location", requireAuth, updateDriverLocation);
router.patch("/update-location", requireAuth, updateDriverLocation);

// Dedicated Driver Heartbeat / Ping endpoints (auto-refresh online status)
router.post("/driver/heartbeat", requireAuth, driverHeartbeat);
router.patch("/driver/heartbeat", requireAuth, driverHeartbeat);
router.post("/heartbeat", requireAuth, driverHeartbeat);
router.patch("/heartbeat", requireAuth, driverHeartbeat);

// Dedicated Driver Online / Offline Toggle & Status endpoints
router.get("/driver/status", requireAuth, getDriverStatus);
router.patch("/driver/status", requireAuth, toggleDriverOnlineStatus);
router.post("/driver/status", requireAuth, toggleDriverOnlineStatus);
router.patch("/driver/toggle-online", requireAuth, toggleDriverOnlineStatus);
router.post("/driver/toggle-online", requireAuth, toggleDriverOnlineStatus);
router.patch("/driver/toggle", requireAuth, toggleDriverOnlineStatus);
router.post("/driver/toggle", requireAuth, toggleDriverOnlineStatus);
router.patch("/status", requireAuth, toggleDriverOnlineStatus);
router.post("/status", requireAuth, toggleDriverOnlineStatus);
router.patch("/toggle-online", requireAuth, toggleDriverOnlineStatus);
router.post("/toggle-online", requireAuth, toggleDriverOnlineStatus);

router.get("/available-rides", optionalAuth, getAvailableRides);
router.get("/nearby", optionalAuth, getAvailableRides);
router.get("/booking/nearby-requests", optionalAuth, getAvailableRides);
router.get("/bookings/nearby-requests", optionalAuth, getAvailableRides);

export default router;
