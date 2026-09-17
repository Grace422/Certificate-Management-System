import { Router } from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { searchQuerySchema } from "./records.validation";
import * as controller from "./records.controller";

// In-memory storage (not disk) - files are small CSVs, parsed immediately
// and never need to persist on the server's filesystem.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB cap
});

const router = Router();
router.use(requireAuth);

router.get("/", validate(searchQuerySchema), controller.search);
router.get("/:id", controller.getById);

// Super Admin only - the bulk migration path for paper archives.
router.post("/bulk-upload", requireRole("super_admin"), upload.single("file"), controller.bulkUpload);

export default router;
