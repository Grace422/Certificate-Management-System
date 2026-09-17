import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createAdminSchema } from "./users.validation";
import * as controller from "./users.controller";

const router = Router();
router.use(requireAuth);

// Only Super Admin manages staff accounts.
router.get("/", requireRole("super_admin"), controller.list);
router.post("/", requireRole("super_admin"), validate(createAdminSchema), controller.createAdmin);
router.get("/:id", requireRole("super_admin"), controller.getById);

export default router;
