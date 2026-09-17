import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createRequestSchema, rejectSchema } from "./requests.validation";
import * as controller from "./requests.controller";

const router = Router();
router.use(requireAuth);

router.post("/", requireRole("citizen"), validate(createRequestSchema), controller.create);

// GET / behaves per-role - see requests.service.list() for the branching logic.
router.get("/", controller.list);
router.get("/:id", controller.getById);

router.patch("/:id/approve", requireRole("origin_admin"), controller.approve);
router.patch("/:id/reject", requireRole("origin_admin"), validate(rejectSchema), controller.reject);
router.patch("/:id/ready", requireRole("destination_admin"), controller.markReady);
router.patch("/:id/complete", requireRole("destination_admin"), controller.complete);

export default router;
