import { Router } from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { listQuerySchema, nearestQuerySchema } from "./councils.validation";
import * as controller from "./councils.controller";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.use(requireAuth); // any authenticated role may look up councils

// IMPORTANT: /nearest must be registered BEFORE /:id, otherwise Express
// would match "nearest" as an :id param on the route below it.
router.get("/nearest", validate(nearestQuerySchema), controller.nearest);
router.get("/", validate(listQuerySchema), controller.list);

// Super Admin only - bulk-loads/updates the municipal council ("courthouse") dataset.
router.post("/bulk-upload", requireRole("super_admin"), upload.single("file"), controller.bulkUpload);

router.get("/:id", controller.getById);

export default router;
