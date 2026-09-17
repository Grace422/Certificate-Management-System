import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { createLossDeclarationSchema } from "./loss.validation";
import * as controller from "./loss.controller";

const router = Router();
router.use(requireAuth, requireRole("citizen"));

router.post("/", validate(createLossDeclarationSchema), controller.create);
router.get("/", controller.list);
router.get("/:id", controller.getById);

export default router;
