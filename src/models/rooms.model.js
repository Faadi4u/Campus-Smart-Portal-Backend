import mongoose, { Schema } from "mongoose";

const roomSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true, // e.g. "CS Lab 1"
    },
    type: {
      type: String,
      enum: ["classroom", "lab", "lecture_room", "seminar_hall", "meeting_room", "library_hall", "other"],
      default: "classroom",
      lowercase:true
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    features: {
      type: [String],
      default: [],
      lowercase:true
    },
     hasProjector: {
      type: Boolean,
      default: false,
    },
    location: {
      type: String,
      required: true, // e.g. "Block A, Floor 2"
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Room = mongoose.model("Room", roomSchema);