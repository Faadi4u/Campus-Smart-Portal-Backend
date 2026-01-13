import { Router } from "express";
import { createRoom, getRooms } from "../controllers/rooms.controller.js";
import { auth, requireRole } from "../middlewares/auth.middlewares.js"; // adjust path/name if needed

const router = Router();

// all room routes require login
router.use(auth);

// list rooms – any authenticated user
router.get("/", getRooms);

// create room – admin only
router.post("/", requireRole("admin"), createRoom);

export default router;