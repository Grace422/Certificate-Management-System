import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env";
import { apiLimiter } from "./middlewares/rateLimiter.middleware";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.middleware";
import routes from "./routes";
import { logger } from "./utils/logger";

export function createApp(): Application {
  const app = express();
  app.set("trust proxy", 1);
  
  // --- Security & parsing middleware (order matters) ---
  app.use(helmet()); // sets secure HTTP headers (CSP, X-Frame-Options, etc.)
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" })); // caps payload size to reduce DoS risk
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }));
  app.use(apiLimiter); // global rate limit; stricter limiter applied on /auth routes

  // --- Routes ---
  app.use(env.API_PREFIX, routes);

  // --- 404 + centralized error handler (must be registered last) ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
