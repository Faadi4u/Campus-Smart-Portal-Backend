import { Router } from "express";
import { signupUser } from "../controllers/auth.signup.controller.js";
import { loginUser ,getCurrentUser } from "../controllers/auth.signin.controller.js";
import { auth } from "../middlewares/auth.middlewares.js";

const router = Router();

router.post("/register" , signupUser);

router.post("/login" , loginUser);

router.get("/me" , auth , getCurrentUser);

export const authRoutes = router;