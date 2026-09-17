import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import * as controller from "./requests.controller";

const router = Router();

// All routes below require a valid JWT. Role checks are added per-route
// once the actual permission model for CertificateRequest is finalized.
router.use(requireAuth);

// GET /api/v1/requests
router.get("/", controller.list);

// GET /api/v1/requests/:id
router.get("/:id", controller.getById);

// POST /api/v1/requests
router.post("/", controller.create);

// PATCH /api/v1/requests/:id
router.patch("/:id", controller.update);

export default router;
