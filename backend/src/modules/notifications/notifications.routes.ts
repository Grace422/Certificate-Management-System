import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import * as controller from "./notifications.controller";

const router = Router();
router.use(requireAuth);

router.get("/", controller.list);
router.patch("/:id/read", controller.markRead);
router.patch("/read-all", controller.markAllRead);

export default router;
