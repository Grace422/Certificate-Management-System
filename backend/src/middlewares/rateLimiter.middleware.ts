import rateLimit from "express-rate-limit";
import { env } from "../config/env";

// General API rate limiter - applied globally in app.ts.
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." }
});

// Stricter limiter for auth endpoints (login/OTP) to slow down
// credential-stuffing / brute-force attacks.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many auth attempts, please try again later." }
});
