import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";
import { env } from "../config/env";

/**
 * Catches errors thrown/passed via next(err) anywhere in the app.
 * MUST be registered LAST, after all routes, in app.ts.
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  let statusCode = 500;
  let message = "Internal server error";
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  }

  // Log full detail server-side; never leak stack traces to the client.
  logger.error(message, {
    statusCode,
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(env.NODE_ENV === "development" ? { stack: err.stack } : {})
  });
}

// 404 handler for unmatched routes - registered right before errorHandler.
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
}
