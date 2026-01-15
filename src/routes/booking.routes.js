import { Router } from "express";
import {
  createBooking,
  getMyBookings,
  getAllBookings,
  updateBookingStatus,
  cancelMyBooking,
  getDashboardStats,
  getMyBookingStats,
} from "../controllers/booking.controller.js";
import { auth, requireRole } from "../middlewares/auth.middlewares.js";

const router = Router();

router.use(auth);

// User routes
router.post("/", createBooking);
router.get("/my-bookings", getMyBookings);
router.get("/my-stats", getMyBookingStats);
router.patch("/:id/cancel", cancelMyBooking);

// Admin routes
router.get("/all", requireRole("admin"), getAllBookings);
router.get("/dashboard", requireRole("admin"), getDashboardStats);
router.patch("/:id/status", requireRole("admin"), updateBookingStatus);
export const bookings =  router;