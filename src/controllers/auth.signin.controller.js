import { User } from "../models/user.model.js";
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
