import { Router } from "express";

import { healthz_routes, readyz_routes } from "./healthHandler.routes.js";

const router = Router();

// Liveness: if this handler runs , the process is live
router.get("/healthz" , healthz_routes);

//Readiness: check Mongo connection state
router.get("/readyz" , readyz_routes);

export const healthRoutes = router