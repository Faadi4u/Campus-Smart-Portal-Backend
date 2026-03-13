import { Booking } from "../models/bookings.model.js";
import { Room } from "../models/rooms.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { sendEmail } from "../utils/sendEmail.js";

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
  const { status, adminComment } = req.body;
  const { id } = req.params;

  if (!["approved", "rejected"].includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  // Populate 'user' to get the email address
  const booking = await Booking.findById(id).populate("user", "fullName email");

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  // Update logic
  booking.status = status;
  if (adminComment) booking.adminComment = adminComment;
  await booking.save();

  // --- EMAIL NOTIFICATION LOGIC ---
  if (booking.user && booking.user.email) {
    const subject = `Booking Update: ${status.toUpperCase()}`;
    
    let message = `
      <h3>Hello ${booking.user.fullName},</h3>
      <p>Your booking request has been <strong>${status}</strong>.</p>
    `;

    if (status === "approved") {
      message += `<p style="color: green;">✅ <strong>Approved!</strong> Please arrive on time.</p>`;
    } else {
      message += `<p style="color: red;">❌ <strong>Rejected.</strong></p>`;
      message += `<p><strong>Reason:</strong> ${adminComment || "Administrative decision"}</p>`;
    }

    message += `<p>Date: ${new Date(booking.startTime).toLocaleDateString()}</p>`;
    
    // Send email (no await, so it doesn't slow down response)
    sendEmail(booking.user.email, subject, message);
  }
  // -------------------------------

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
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  // 1. Booking Counts (Your Old Logic + Week Stats)
  const totalBookings = await Booking.countDocuments();
  const pendingBookings = await Booking.countDocuments({ status: "pending" });
  const approvedBookings = await Booking.countDocuments({ status: "approved" });
  const rejectedBookings = await Booking.countDocuments({ status: "rejected" });
  const cancelledBookings = await Booking.countDocuments({ status: "cancelled" });
  
  const todayBookingsCount = await Booking.countDocuments({
    startTime: { $gte: today, $lt: tomorrow },
  });
  
  const weekBookings = await Booking.countDocuments({
    startTime: { $gte: startOfWeek },
  });

  // 2. Room Breakdown (NEW REQUIREMENT: Labs, Halls, etc.)
  const roomStats = await Room.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
      },
    },
  ]);

  const roomTypeCounts = {};
  roomStats.forEach((r) => {
    roomTypeCounts[r._id] = r.count;
  });

  // 3. Projector Counts (NEW REQUIREMENT)
  const projectorCount = await Room.countDocuments({ isActive: true, hasProjector: true });
  const totalRooms = await Room.countDocuments({ isActive: true });

  // 4. Vacant vs Booked Today (NEW REQUIREMENT)
  const bookedRoomIds = await Booking.distinct("room", {
    startTime: { $gte: today, $lt: tomorrow },
    status: { $in: ["approved", "pending"] },
    resourceType: "Room"
  });

  const bookedCount = bookedRoomIds.length;
  const vacantCount = totalRooms - bookedCount;

  // 5. Top Rooms (Keep your old logic, it was good!)
  const topRooms = await Booking.aggregate([
    { $match: { resourceType: "Room" } },
    { $group: { _id: "$room", totalBookings: { $sum: 1 } } },
    { $sort: { totalBookings: -1 } },
    { $limit: 5 },
    { $lookup: { from: "rooms", localField: "_id", foreignField: "_id", as: "room" } },
    { $unwind: "$room" },
    {
      $project: {
        roomName: "$room.name",
        location: "$room.location",
        totalBookings: 1,
      },
    },
  ]);

  // 6. Build Final Response
  const dashboardData = {
    overview: {
      total: totalBookings,
      today: todayBookingsCount,
      thisWeek: weekBookings,
      pending: pendingBookings,
      approved: approvedBookings,
    },
    statusSummary: { // Keep this structure for your frontend
      pending: pendingBookings,
      approved: approvedBookings,
      rejected: rejectedBookings,
      cancelled: cancelledBookings,
    },
    rooms: {
      total: totalRooms,
      bookedToday: bookedCount,
      vacantToday: vacantCount,
      withProjector: projectorCount,
      byType: roomTypeCounts, // { lab: 2, lecture_room: 5 }
    },
    topRooms: topRooms, // Keep the chart data
  };

  return res
    .status(200)
    .json(new ApiResponse(200, dashboardData, "Dashboard stats fetched"));
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

// --- Advanced Search Bookings ---
export const searchBookings = asyncHandler(async (req, res) => {
  const {
    status,
    resourceType,
    resourceId,
    userId,
    startDate,
    endDate,
    page = 1,
    limit = 10,
  } = req.query;

  const filter = {};

  if (status) filter.status = status;
  if (resourceType) filter.resourceType = resourceType;
  if (resourceId) filter.resourceId = resourceId;
  if (userId) filter.user = userId;

  // Date range filter
  if (startDate || endDate) {
    filter.startTime = {};
    if (startDate) filter.startTime.$gte = new Date(startDate);
    if (endDate) filter.startTime.$lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const bookings = await Booking.find(filter)
    .populate("user", "fullName email role")
    .populate("resourceId", "name location capacity")
    .sort({ startTime: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Booking.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(200, {
      bookings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    }, "Bookings fetched")
  );
});

// --- Calendar View (Month) ---
export const getCalendarBookings = asyncHandler(async (req, res) => {
  const { year, month, resourceId } = req.query;

  if (!year || !month) {
    throw new ApiError(400, "year and month are required (e.g., ?year=2024&month=1)");
  }

  const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
  const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

  const filter = {
    startTime: { $gte: startOfMonth, $lte: endOfMonth },
    status: { $in: ["pending", "approved"] },
  };

  if (resourceId) filter.resourceId = resourceId;

  const bookings = await Booking.find(filter)
    .populate("user", "fullName")
    .populate("resourceId", "name")
    .sort({ startTime: 1 });

  // Format for calendar display
  const calendarData = bookings.map((b) => ({
    id: b._id,
    title: b.purpose,
    start: b.startTime,
    end: b.endTime,
    status: b.status,
    user: b.user?.fullName,
    resource: b.resourceId?.name,
    resourceType: b.resourceType,
  }));

  return res.status(200).json(new ApiResponse(200, calendarData, "Calendar data fetched"));
});

// --- Check Room Availability for a Date ---
export const checkAvailability = asyncHandler(async (req, res) => {
  const { resourceId, date } = req.query;

  if (!resourceId || !date) {
    throw new ApiError(400, "resourceId and date are required");
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await Booking.find({
    resourceId,
    status: { $in: ["pending", "approved"] },
    $or: [
      { startTime: { $gte: startOfDay, $lte: endOfDay } },
      { endTime: { $gte: startOfDay, $lte: endOfDay } },
    ],
  }).select("startTime endTime status purpose");

  // Generate available slots (9 AM to 6 PM, 1-hour slots)
  const bookedSlots = bookings.map((b) => ({
    start: b.startTime,
    end: b.endTime,
    status: b.status,
  }));

  return res.status(200).json(
    new ApiResponse(200, {
      date,
      resourceId,
      bookedSlots,
    }, "Availability checked")
  );
});