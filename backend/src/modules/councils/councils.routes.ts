import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import * as controller from "./councils.controller";

const router = Router();

// All routes below require a valid JWT. Role checks are added per-route
// once the actual permission model for Council is finalized.
router.use(requireAuth);

// GET /api/v1/councils
router.get("/", controller.list);

// GET /api/v1/councils/:id
router.get("/:id", controller.getById);

// POST /api/v1/councils
router.post("/", controller.create);

// PATCH /api/v1/councils/:id
router.patch("/:id", controller.update);

export default router;
