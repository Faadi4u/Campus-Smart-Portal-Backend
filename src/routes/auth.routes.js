import { Router } from "express";

import { loginUser , signupUser , getCurrentUser , updateAccountDetails , changeCurrentPassword } from "../controllers/auth.controller.js";
import { auth } from "../middlewares/auth.middlewares.js";

const router = Router();

router.post("/register" , signupUser);

router.post("/login" , loginUser);

router.get("/me" , auth , getCurrentUser);

router.route("/update-account").patch(auth, updateAccountDetails);

router.route("/change-password").patch(auth, changeCurrentPassword);

export const authRoutes = router;