import { Router } from "express";
import { authLimiter } from "../../middlewares/rateLimiter.middleware";
import * as authController from "./auth.controller";

const router = Router();

// POST /api/v1/auth/register
router.post("/register", authLimiter, authController.register);

// POST /api/v1/auth/login  (step 1: email + password -> may require OTP)
router.post("/login", authLimiter, authController.login);

// POST /api/v1/auth/mfa/verify (step 2: submit TOTP code)
router.post("/mfa/verify", authLimiter, authController.verifyMfa);

// POST /api/v1/auth/refresh
router.post("/refresh", authController.refresh);

// POST /api/v1/auth/logout
router.post("/logout", authController.logout);

export default router;
