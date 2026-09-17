import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import * as controller from "./audit.controller";

const router = Router();
router.use(requireAuth, requireRole("super_admin"));
router.get("/", controller.list);

export default router;
