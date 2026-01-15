import { Booking } from "../models/bookings.model.js";
import { Room } from "../models/rooms.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Helper: check overlapping bookings
// Overlap if: newStart < existingEnd AND newEnd > existingStart
const hasConflict = async (roomId, start, end, excludeBookingId = null) => {
  const filter = {
    room: roomId,
    status: { $in: ["pending", "approved"] },
    startTime: { $lt: end },
    endTime: { $gt: start },
  };

  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }

  const conflict = await Booking.findOne(filter);
  return !!conflict;
};

// POST /api/v1/bookings
// student/faculty/admin can request a booking
export const createBooking = asyncHandler(async (req, res) => {
  const { roomId, startTime, endTime, purpose } = req.body;

  if (!roomId || !startTime || !endTime || !purpose) {
    throw new ApiError(400, "roomId, startTime, endTime and purpose are required");
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start) || isNaN(end)) {
    throw new ApiError(400, "Invalid date format");
  }

  if (start >= end) {
    throw new ApiError(400, "startTime must be before endTime");
  }

  // Optional: prevent booking in the past
  if (start < new Date()) {
    throw new ApiError(400, "Cannot book a room in the past");
  }

  const room = await Room.findById(roomId);
  if (!room || !room.isActive) {
    throw new ApiError(404, "Room not found or inactive");
  }

  const conflict = await hasConflict(roomId, start, end);
  if (conflict) {
    throw new ApiError(409, "Time slot is already booked for this room");
  }

  const booking = await Booking.create({
    user: req.user._id,
    room: roomId,
    startTime: start,
    endTime: end,
    purpose,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, booking, "Booking request created"));
});

// GET /api/v1/bookings/my
// get bookings of current user
export const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate("room", "name location type")
    .sort({ startTime: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, bookings, "User bookings fetched"));
});

// GET /api/v1/bookings
// admin: get all bookings (optionally filter by status)
export const getAllBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const bookings = await Booking.find(filter)
    .populate("user", "fullName email role")
    .populate("room", "name location type")
    .sort({ startTime: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, bookings, "All bookings fetched"));
});

// PATCH /api/v1/bookings/:id/status
// admin: approve/reject/cancel booking
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, adminComment } = req.body;

  if (!["approved", "rejected", "cancelled"].includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  const booking = await Booking.findById(id);
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  // If approving, re-check conflicts for safety
  if (status === "approved") {
    const conflict = await hasConflict(
      booking.room,
      booking.startTime,
      booking.endTime,
      booking._id
    );
    if (conflict) {
      throw new ApiError(
        409,
        "Cannot approve. Room is already booked in this time slot."
      );
    }
  }

  booking.status = status;
  if (adminComment !== undefined) {
    booking.adminComment = adminComment;
  }

  await booking.save();

  return res
    .status(200)
    .json(new ApiResponse(200, booking, `Booking ${status} successfully`));
});

// PATCH /api/v1/bookings/:id/cancel
// user: cancel own pending/approved booking
export const cancelMyBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const booking = await Booking.findById(id);
  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can cancel only your own bookings");
  }

  if (!["pending", "approved"].includes(booking.status)) {
    throw new ApiError(400, "Only pending or approved bookings can be cancelled");
  }

  booking.status = "cancelled";
  await booking.save();

  return res
    .status(200)
    .json(new ApiResponse(200, booking, "Booking cancelled"));
});


// --- Dashboard Stats (Admin) ---
export const getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Booking counts by status
  const statusCounts = await Booking.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // Today's bookings
  const todayBookings = await Booking.countDocuments({
    startTime: { $gte: today },
    startTime: { $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
  });

  // This week's bookings
  const weekBookings = await Booking.countDocuments({
    startTime: { $gte: startOfWeek },
  });

  // This month's bookings
  const monthBookings = await Booking.countDocuments({
    startTime: { $gte: startOfMonth },
  });

  // Most booked rooms (top 5)
  const topRooms = await Booking.aggregate([
    { $match: { resourceType: "Room" } },
    {
      $group: {
        _id: "$resourceId",
        totalBookings: { $sum: 1 },
      },
    },
    { $sort: { totalBookings: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "rooms",
        localField: "_id",
        foreignField: "_id",
        as: "room",
      },
    },
    { $unwind: "$room" },
    {
      $project: {
        _id: 0,
        roomId: "$_id",
        roomName: "$room.name",
        location: "$room.location",
        totalBookings: 1,
      },
    },
  ]);

  // Peak hours (group by hour)
  const peakHours = await Booking.aggregate([
    {
      $group: {
        _id: { $hour: "$startTime" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $project: {
        _id: 0,
        hour: "$_id",
        bookings: "$count",
      },
    },
  ]);

  // Format status counts
  const statusSummary = {
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
  };
  statusCounts.forEach((s) => {
    statusSummary[s._id] = s.count;
  });

  return res.status(200).json(
    new ApiResponse(200, {
      overview: {
        today: todayBookings,
        thisWeek: weekBookings,
        thisMonth: monthBookings,
        total: Object.values(statusSummary).reduce((a, b) => a + b, 0),
      },
      statusSummary,
      topRooms,
      peakHours,
    }, "Dashboard stats fetched")
  );
});

// --- User's own booking stats ---
export const getMyBookingStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const stats = await Booking.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = {
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    total: 0,
  };

  stats.forEach((s) => {
    summary[s._id] = s.count;
    summary.total += s.count;
  });

  return res.status(200).json(new ApiResponse(200, summary, "My booking stats fetched"));
});