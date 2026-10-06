import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createLossDeclarationSchema, reviewLossDeclarationSchema, rejectLossDeclarationSchema } from "./loss.validation";
import * as controller from "./loss.controller";

const router = Router();
router.use(requireAuth);

router.post("/", requireRole("citizen"), validate(createLossDeclarationSchema), controller.create);
router.get("/", requireRole("citizen", "super_admin"), controller.list);
router.get("/:id", requireRole("citizen", "super_admin"), controller.getById);

router.patch("/:id/verify", requireRole("super_admin"), validate(reviewLossDeclarationSchema), controller.verify);
router.patch("/:id/reject", requireRole("super_admin"), validate(rejectLossDeclarationSchema), controller.reject);

export default router;
