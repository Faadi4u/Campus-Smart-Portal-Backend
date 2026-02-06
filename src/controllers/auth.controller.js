import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js"; 
import { ApiError } from "../utils/ApiError.js";      
import { ApiResponse } from "../utils/ApiResponse.js";

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