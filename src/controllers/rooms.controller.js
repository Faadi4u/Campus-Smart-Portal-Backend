import { Room } from "../models/rooms.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createRoom = asyncHandler(async (req, res) => {
  const { name, type, capacity, features, location , hasProjector } = req.body;

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
    hasProjector: hasProjector || false,
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

export const searchRooms = asyncHandler(async (req, res) => {
  const { 
    name, type, minCapacity, maxCapacity, features, location, hasProjector 
  } = req.query;

  const filter = { isActive: true };

  if (name) {
    filter.name = { $regex: name, $options: "i" };
  }

  if (type) filter.type = type;

  if (hasProjector !== undefined) {

    filter.hasProjector = hasProjector === "true";
  }

  if (minCapacity || maxCapacity) {
    filter.capacity = {};
    if (minCapacity) filter.capacity.$gte = parseInt(minCapacity);
    if (maxCapacity) filter.capacity.$lte = parseInt(maxCapacity);
  }

  if (features) {
    const featureList = features.split(",").map((f) => f.trim().toLowerCase());
    filter.features = { $all: featureList };
  }

  if (location) {
    filter.location = { $regex: location, $options: "i" };
  }

  const rooms = await Room.find(filter).sort({ name: 1 });

  return res.status(200).json(new ApiResponse(200, rooms, "Rooms fetched"));
});

export const updateRoom = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, type, capacity, features, location, hasProjector } = req.body;

  const room = await Room.findById(id);

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  room.name = name || room.name;
  room.type = type || room.type;
  room.capacity = capacity || room.capacity;
  room.features = features || room.features;
  room.location = location || room.location;
  room.hasProjector = hasProjector !== undefined ? hasProjector : room.hasProjector;

  await room.save();

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Room updated successfully"));
});


export const deleteRoom = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const room = await Room.findById(id);

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  room.isActive = false;
  await room.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Room deleted successfully"));
});