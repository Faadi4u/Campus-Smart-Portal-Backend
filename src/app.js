import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {healthRoutes}  from "./routes/health.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { authRoutes } from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js";
import { bookings } from "./routes/booking.routes.js";


const app = express();

app.use(cors({origin : process.env.CORS_ORIGIN, credentials: true }));

app.use(express.json({limit: "16kb"}));

app.use(express.urlencoded({extended:true , limit: "16kb"}));

app.use(cookieParser());

app.use("/api/v1" , healthRoutes);

app.use("/api/v1" , authRoutes);

app.use("/api/v1/rooms", roomRoutes);

app.use("/api/v1/booking" , bookings);

//Error Hnadler Middleware
app.use(errorHandler);

export {app}