import { Router } from "express";
import { authLimiter } from "../../middlewares/rateLimiter.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { requireAuth } from "../../middlewares/auth.middleware";
import { registerSchema, loginSchema, mfaSetupVerifySchema, mfaLoginVerifySchema } from "./auth.validation";
import * as authController from "./auth.controller";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/mfa/setup/verify", authLimiter, validate(mfaSetupVerifySchema), authController.verifyMfaSetup);

router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/mfa/verify", authLimiter, validate(mfaLoginVerifySchema), authController.verifyMfaLogin);

router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

router.get("/me", requireAuth, authController.me);

export default router;
