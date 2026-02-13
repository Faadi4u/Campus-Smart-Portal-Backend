import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { SALT_ROUNDS } from "../constant.js";

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },

    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["student", "admin", "faculty"],
      default: "student",
    },

    department: {
      type: String,
      trim: true, // e.g. "Computer Science"
    },

    // Student-specific (optional for faculty/admin)
    registrationNumber: {
      type: String,
      trim: true,
      index: true, // useful for search
    },

    semester: {
      type: Number,
      min: 1,
      max: 12, // adjust for your program
    },

    section: {
      type: String,
      trim: true, // e.g. "A", "BSCS-8A"
    },

    designation: {
      type: String,
      trim: true, // e.g. "Lecturer", "Assistant Professor"
    },

    // Contact / misc

    avatar: {
    type: String, // Cloudinary URL
    default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    forgotPasswordToken: String,
    forgotPasswordTokenExpiry: Date,

  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  // No next() needed here when using async
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return bcrypt.compare(password, this.password);
};



userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      fullName: this.fullName,
      email: this.email,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
