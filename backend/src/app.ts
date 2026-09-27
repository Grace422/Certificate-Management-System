import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { env } from "./config/env";
import { apiLimiter } from "./middlewares/rateLimiter.middleware";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.middleware";
import routes from "./routes";
import { logger } from "./utils/logger";

export function createApp(): Application {
  const app = express();

  // Trust the first hop (reverse proxy/load balancer) so req.secure and
  // req.ip reflect X-Forwarded-Proto/X-Forwarded-For correctly. Needed for
  // the refresh-token cookie's Secure flag to be set correctly in any
  // deployment sitting behind a proxy (Nginx, Render, Railway, etc.) -
  // without this, req.secure is always false behind a proxy even when the
  // public-facing connection is HTTPS.
  app.set("trust proxy", 1);

  // --- Security & parsing middleware (order matters) ---
  app.use(helmet()); // sets secure HTTP headers (CSP, X-Frame-Options, etc.)
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" })); // caps payload size to reduce DoS risk
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser()); // required to read the httpOnly refresh-token cookie
  app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }));
  app.use(apiLimiter); // global rate limit; stricter limiter applied on /auth routes

  // --- Routes ---
  app.use(env.API_PREFIX, routes);

  // --- 404 + centralized error handler (must be registered last) ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
