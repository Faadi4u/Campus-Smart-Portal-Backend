import { User } from "../models/user.model.js";

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