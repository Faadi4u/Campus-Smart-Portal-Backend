import crypto from "crypto";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js"; 
import { ApiError } from "../utils/ApiError.js";      
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { sendEmail } from "../utils/sendEmail.js";

// LOGIN (signin)
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Must select password explicitly because of select: false
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.isPasswordCorrect(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Remove password before sending
    user.password = undefined;

    return res.json({
      message: "Login successful",
      user,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

// GET CURRENT USER (profile)
const getCurrentUser = async (req, res, next) => {
  try {
    // req.user will be set by auth middleware after verifying token
    return res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
};

export { loginUser, getCurrentUser };


// Sign Up User
const signupUser = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      password,
      role,
      department,
      registrationNumber,
      semester,
      section,
      designation,
      avatarUrl,
    } = req.body;

    const exisiting = await User.findOne({ email });
    if (exisiting)
      return res.status(409).json({ message: "Email already registered" });

    const user = await User.create({
      fullName,
      email,
      password,
      role, // optional, can default to "student"
      department,
      registrationNumber,
      semester,
      section,
      designation,
      avatarUrl,
    });

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    const userData = {
        
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department,
      registrationNumber: user.registrationNumber,
      semester: user.semester,
      section: user.section,
      designation: user.designation,
      avatarUrl: user.avatarUrl,
    }

    return res.status(201).json({message: "USer created Successfully",
        userData,
        accessToken,
        refreshToken,
    });

  } catch (error) {
    next(error);
  }
};

export {signupUser}


// Update Profile (Name & Email) 
export const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "Full Name and Email are required");
  }

  // Find user by ID (req.user._id comes from your auth middleware)
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true } // This returns the updated document
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});


// Change Password 
export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both old and new passwords are required");
  }

  // We need to 'select' the password because it is hidden in the schema
  const user = await User.findById(req.user?._id).select("+password");

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// --- Delete User Account ---
export const deleteAccount = asyncHandler(async (req, res) => {
  // 1. Find and delete the user
  // req.user._id comes from your auth middleware
  const user = await User.findByIdAndDelete(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Optional: You might want to delete all bookings made by this user too
  // await Booking.deleteMany({ user: req.user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Account deleted successfully"));
});

// --- Update Avatar ---
export const updateAvatar = asyncHandler(async (req, res) => {
  // 1. Check if file is uploaded by Multer
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  // 2. Upload to Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  // 3. Update User in DB
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

// remove avatar 
export const removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: "" } }, // Clear the field
    { new: true }
  ).select("-password");

  return res.status(200).json(new ApiResponse(200, user, "Avatar removed"));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User with this email does not exist");
  }

  // Generate a random token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Save hashed token and expiry (20 minutes) to DB
  user.forgotPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  user.forgotPasswordTokenExpiry = Date.now() + 20 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  // Create reset URL
  const resetUrl = `${process.env.CORS_ORIGIN}/reset-password/${resetToken}`;

  const message = `
    <h2>Password Reset Request</h2>
    <p>You requested to reset your password. Click the link below to set a new one. This link expires in 20 minutes.</p>
    <a href="${resetUrl}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  try {
    await sendEmail(user.email, "Password Reset Request", message);
    return res.status(200).json(new ApiResponse(200, {}, "Reset link sent to email"));
  } catch (error) {
    user.forgotPasswordToken = undefined;
    user.forgotPasswordTokenExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, "Error sending email. Try again later.");
  }
});

// 2. RESET PASSWORD (Set New Password)
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Token is invalid or has expired");
  }

  // Set new password (the model pre-save hook will hash it)
  user.password = password;
  user.forgotPasswordToken = undefined;
  user.forgotPasswordTokenExpiry = undefined;
  await user.save();

  return res.status(200).json(new ApiResponse(200, {}, "Password reset successfully"));
});