import { Router } from "express";

import { loginUser , signupUser , getCurrentUser , updateAccountDetails , changeCurrentPassword , deleteAccount , updateAvatar , removeAvatar} from "../controllers/auth.controller.js";
import { auth } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.post("/register" , signupUser);

router.post("/login" , loginUser);

router.get("/me" , auth , getCurrentUser);

router.route("/update-account").patch(auth, updateAccountDetails);

router.route("/change-password").patch(auth, changeCurrentPassword);

router.route("/delete-account").delete(auth, deleteAccount);

router.route("/update-avatar").patch(auth, upload.single("avatar"), updateAvatar);

router.route("/remove-avatar").patch(auth, removeAvatar); // Note: using PATCH since we update user

export const authRoutes = router;