import { Room } from "../models/rooms.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createRoom = asyncHandler(async (req, res) => {
  const { name, type, capacity, features, location } = req.body;

  if (!name || !capacity || !location) {
    throw new ApiError(400, "name , capacity and location are required");
  }

  const exists =await  Room.findOne({ name });
  if (exists) {
    throw new ApiError(409, `Room with name: ${name} already exists`);
  }

  const room = await Room.create({
    name,
    type,
    capacity,
    features,
    location,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, room, "Room created successfully"));
});

export const getRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find({ isActive: true }).sort({ name: 1 });
  return res
    .status(200)
    .json(new ApiResponse(200, rooms, "Rooms fetched successfully"));
});
