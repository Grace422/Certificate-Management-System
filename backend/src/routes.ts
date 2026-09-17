import { Router } from "express";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/users.routes";
import recordRoutes from "./modules/records/records.routes";
import requestRoutes from "./modules/requests/requests.routes";
import councilRoutes from "./modules/councils/councils.routes";
import auditRoutes from "./modules/audit/audit.routes";

const router = Router();

router.get("/health", (_req, res) => res.json({ success: true, message: "CSCMS API is running" }));

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/records", recordRoutes);
router.use("/requests", requestRoutes);
router.use("/councils", councilRoutes);
router.use("/audit-logs", auditRoutes);

export default router;
